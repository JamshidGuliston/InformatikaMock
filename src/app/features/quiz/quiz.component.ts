import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, interval, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AssignmentService } from '../../core/services/assignment.service';
import { ProgressService } from '../../core/services/progress.service';
import {
  Assignment,
  AssignmentAttempt,
  MultipleChoiceData,
  MatchingData,
  OrderingData,
  Question,
} from '../../core/models';

export interface StudentAnswer {
  questionId: string;
  value: unknown;
}

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './quiz.component.html',
})
export class QuizComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly assignmentService = inject(AssignmentService);
  private readonly progressService = inject(ProgressService);

  readonly student = this.auth.student;
  readonly assignment = signal<Assignment | null>(null);
  readonly questions = signal<Question[]>([]);
  readonly currentIdx = signal(0);
  readonly answers = signal<Map<string, unknown>>(new Map());
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly attempt = signal<AssignmentAttempt | null>(null);
  readonly timeLeft = signal(0);
  readonly showConfirm = signal(false);

  private timerSub?: Subscription;

  ngOnInit(): void {
    const assignmentId = this.route.snapshot.paramMap.get('id')!;
    const studentId = this.student()!.id;

    forkJoin({
      assignment: this.assignmentService.getAssignment(assignmentId),
      attemptsRes: this.progressService.getAttempts(studentId, assignmentId),
    }).subscribe({
      next: ({ assignment, attemptsRes }) => {
        this.assignment.set(assignment);
        const qs = [...(assignment.questions ?? [])].sort((a, b) => a.order_index - b.order_index);
        this.questions.set(qs);

        const allAttempts = attemptsRes.results;
        // Find any in-progress attempt (started but not submitted)
        const inProgress = allAttempts.find((a) => !a.submitted_at);
        const submitted = allAttempts.filter((a) => !!a.submitted_at);

        if (inProgress) {
          // Resume in-progress attempt — restore answers from sessionStorage
          this.attempt.set(inProgress);
          this._initAnswers(qs, inProgress.id);
          this.loading.set(false);

          if (assignment.time_limit) {
            const startedAt = new Date(inProgress.started_at).getTime();
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const remaining = assignment.time_limit * 60 - elapsed;
            if (remaining > 0) {
              this.timeLeft.set(remaining);
              this.startTimer();
            } else {
              this.submitQuiz();
            }
          }
          return;
        }

        if (submitted.length >= assignment.attempts_allowed) {
          // All attempts used — redirect to last result
          const last = submitted[0];
          this.router.navigate(['/results', last.id]);
          return;
        }

        // Start a new attempt
        this._initAnswers(qs, null);
        const maxScore = qs.reduce((sum, q) => sum + q.points, 0);
        this.progressService
          .startAttempt(studentId, assignmentId, submitted.length + 1, maxScore)
          .subscribe({
            next: (attempt) => {
              this.attempt.set(attempt);
              this.loading.set(false);
              if (assignment.time_limit) {
                this.timeLeft.set(assignment.time_limit * 60);
                this.startTimer();
              }
            },
          });
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }

  private startTimer(): void {
    this.timerSub = interval(1000).subscribe(() => {
      const t = this.timeLeft() - 1;
      this.timeLeft.set(t);
      if (t <= 0) this.submitQuiz();
    });
  }

  /** Initialize answer map with defaults, then overlay saved sessionStorage answers if any */
  private _initAnswers(qs: Question[], attemptId: string | null): void {
    const map = new Map<string, unknown>();

    qs.forEach((q) => {
      const kind = this.getQuestionKind(q);
      if (kind === 'matching') {
        const data = q.question_data as MatchingData;
        const matchMap: Record<string, string> = {};
        data.pairs?.forEach((p) => { matchMap[p.left] = ''; });
        map.set(q.id, matchMap);
      } else if (kind === 'ordering') {
        const data = q.question_data as OrderingData;
        map.set(q.id, [...(data.items ?? [])]);
      } else {
        map.set(q.id, null);
      }
    });

    if (attemptId) {
      try {
        const saved = sessionStorage.getItem(`quiz_answers_${attemptId}`);
        if (saved) {
          const obj = JSON.parse(saved) as Record<string, unknown>;
          Object.entries(obj).forEach(([qId, val]) => {
            if (map.has(qId)) map.set(qId, val);
          });
        }
      } catch { /* ignore parse errors */ }
    }

    this.answers.set(map);
  }

  /** Persist current answers to sessionStorage */
  private _saveAnswers(): void {
    const attemptId = this.attempt()?.id;
    if (!attemptId) return;
    const obj = Object.fromEntries(this.answers());
    sessionStorage.setItem(`quiz_answers_${attemptId}`, JSON.stringify(obj));
  }

  // ---- Answer helpers ----

  setAnswer(questionId: string, value: unknown): void {
    const map = new Map(this.answers());
    map.set(questionId, value);
    this.answers.set(map);
    this._saveAnswers();
  }

  getAnswer(questionId: string): unknown {
    return this.answers().get(questionId) ?? null;
  }

  isSelected(questionId: string, option: string): boolean {
    const ans = this.getAnswer(questionId);
    if (Array.isArray(ans)) return ans.includes(option);
    return ans === option;
  }

  toggleMultiSelect(questionId: string, option: string): void {
    const cur = this.getAnswer(questionId);
    const arr: string[] = Array.isArray(cur) ? [...cur] : [];
    const idx = arr.indexOf(option);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(option);
    this.setAnswer(questionId, arr);
  }

  setMatchingAnswer(questionId: string, leftItem: string, rightValue: string): void {
    const cur = (this.getAnswer(questionId) as Record<string, string>) ?? {};
    this.setAnswer(questionId, { ...cur, [leftItem]: rightValue });
  }

  getMatchingAnswer(questionId: string, leftItem: string): string {
    const ans = this.getAnswer(questionId) as Record<string, string>;
    return ans?.[leftItem] ?? '';
  }

  getOrderingAnswer(questionId: string): string[] {
    const ans = this.getAnswer(questionId);
    return Array.isArray(ans) ? ans : [];
  }

  moveOrderItem(questionId: string, fromIdx: number, toIdx: number): void {
    const arr = [...this.getOrderingAnswer(questionId)];
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    this.setAnswer(questionId, arr);
  }

  // ---- Navigation ----

  goto(idx: number): void {
    this.currentIdx.set(idx);
  }

  next(): void {
    if (this.currentIdx() < this.questions().length - 1) {
      this.currentIdx.update((i) => i + 1);
    }
  }

  prev(): void {
    if (this.currentIdx() > 0) {
      this.currentIdx.update((i) => i - 1);
    }
  }

  answeredCount(): number {
    let count = 0;
    this.questions().forEach((q) => {
      const ans = this.getAnswer(q.id);
      if (ans !== null && ans !== undefined && ans !== '') count++;
    });
    return count;
  }

  isAnswered(questionId: string): boolean {
    const ans = this.getAnswer(questionId);
    if (ans === null || ans === undefined) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === 'object') return Object.values(ans as object).some((v) => v !== '');
    return ans !== '';
  }

  // ---- Question kind detection (from question_data structure) ----

  getQuestionKind(q: Question): 'multiple_choice' | 'true_false' | 'matching' | 'ordering' | 'fill_blank' | 'text' {
    const data = q.question_data as Record<string, unknown>;
    if ('options' in data) return 'multiple_choice';
    if ('pairs' in data) return 'matching';
    if ('items' in data) return 'ordering';
    if ('text' in data) return 'fill_blank';
    if ('statement' in data) return 'true_false';
    return 'text';
  }

  // ---- Grading ----

  private gradeQuestion(question: Question): { isCorrect: boolean; points: number } {
    const kind = this.getQuestionKind(question);
    const userAnswer = this.getAnswer(question.id);
    const correct = question.correct_answer;

    if (kind === 'multiple_choice') {
      // correct_answer may be the option text OR a legacy numeric index string
      let correctText = String(correct);
      if (/^\d+$/.test(correctText)) {
        const opts = this.getOptions(question);
        correctText = opts[parseInt(correctText, 10)] ?? correctText;
      }
      const isCorrect = userAnswer === correctText;
      return { isCorrect, points: isCorrect ? question.points : 0 };
    }

    if (kind === 'true_false') {
      const isCorrect = String(userAnswer) === String(correct);
      return { isCorrect, points: isCorrect ? question.points : 0 };
    }

    if (kind === 'matching') {
      const userMap = userAnswer as Record<string, string>;
      const correctMap = correct as Record<string, string>;
      const isCorrect = Object.entries(correctMap).every(
        ([k, v]) => userMap?.[k] === v,
      );
      return { isCorrect, points: isCorrect ? question.points : 0 };
    }

    if (kind === 'ordering') {
      const userArr = userAnswer as string[];
      const correctArr = correct as string[];
      const isCorrect = JSON.stringify(userArr) === JSON.stringify(correctArr);
      return { isCorrect, points: isCorrect ? question.points : 0 };
    }

    if (kind === 'fill_blank') {
      const isCorrect =
        String(userAnswer).trim().toLowerCase() ===
        String(correct).trim().toLowerCase();
      return { isCorrect, points: isCorrect ? question.points : 0 };
    }

    // text — auto-grade if correct_answer is set, otherwise manual
    const correctStr = String(correct ?? '').trim();
    if (correctStr) {
      const isCorrect = String(userAnswer).trim().toLowerCase() === correctStr.toLowerCase();
      return { isCorrect, points: isCorrect ? question.points : 0 };
    }
    return { isCorrect: false, points: 0 };
  }

  confirmSubmit(): void {
    this.showConfirm.set(true);
  }

  cancelSubmit(): void {
    this.showConfirm.set(false);
  }

  submitQuiz(): void {
    this.timerSub?.unsubscribe();
    this.submitting.set(true);
    this.showConfirm.set(false);

    // Clear persisted answers
    const attemptId = this.attempt()?.id;
    if (attemptId) {
      sessionStorage.removeItem(`quiz_answers_${attemptId}`);
    }

    const assignment = this.assignment()!;
    const qs = this.questions();
    let totalScore = 0;
    const maxScore = qs.reduce((s, q) => s + q.points, 0);

    const answersToSave = qs.map((q) => {
      const { isCorrect, points } = this.gradeQuestion(q);
      totalScore += points;
      return {
        questionId: q.id,
        answerData: this.getAnswer(q.id),
        isCorrect,
        pointsEarned: points,
      };
    });

    const passingScore = Math.ceil((maxScore * assignment.total_points) / 100) || Math.ceil(maxScore * 0.7);
    const isPassed = totalScore >= passingScore;

    this.progressService
      .submitFullAttempt(
        this.attempt()!.id,
        answersToSave,
        totalScore,
        maxScore,
        isPassed,
      )
      .subscribe({
        next: (attempt) => {
          this.router.navigate(['/results', attempt.id]);
        },
        error: () => this.submitting.set(false),
      });
  }

  // ---- Timer display ----

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  isTimeLow(): boolean {
    return this.assignment()?.time_limit !== undefined && this.timeLeft() < 60;
  }

  getTypeLabel(): string {
    const asgn = this.assignment();
    if (!asgn) return 'Test';
    return asgn.assignment_type?.name ?? 'Test';
  }

  getOptions(question: Question): string[] {
    const data = question.question_data as MultipleChoiceData;
    return data?.options ?? [];
  }

  getMatchingPairs(question: Question): { left: string; right: string }[] {
    const data = question.question_data as MatchingData;
    return data?.pairs ?? [];
  }

  getRightOptions(question: Question): string[] {
    return this.getMatchingPairs(question).map((p) => p.right);
  }
}
