import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AssignmentService } from '../../core/services/assignment.service';
import { ProgressService } from '../../core/services/progress.service';
import { ApiService } from '../../core/services/api.service';
import { Assignment, AssignmentAttempt, Question, QuestionAnswer } from '../../core/models';

interface QuestionResult {
  question: Question;
  answer: QuestionAnswer | null;
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './results.component.html',
})
export class ResultsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly progressService = inject(ProgressService);
  private readonly assignmentService = inject(AssignmentService);
  private readonly apiService = inject(ApiService);

  readonly attempt = signal<AssignmentAttempt | null>(null);
  readonly assignment = signal<Assignment | null>(null);
  readonly results = signal<QuestionResult[]>([]);
  readonly loading = signal(true);
  readonly showDetails = signal(false);
  readonly lessonId = signal('');
  readonly resetting = signal(false);
  readonly resetDone = signal(false);
  readonly resetError = signal('');

  ngOnInit(): void {
    const attemptId = this.route.snapshot.paramMap.get('id')!;

    this.apiService.getOne<AssignmentAttempt>('attempts', attemptId).subscribe({
      next: (attempt: AssignmentAttempt) => {
        this.attempt.set(attempt);
        const assignmentId = typeof attempt.assignment === 'string'
          ? attempt.assignment
          : (attempt.assignment as Assignment).id;

        forkJoin({
          assignment: this.assignmentService.getAssignment(assignmentId),
          answers: this.progressService.getAnswers(attemptId),
        }).subscribe({
          next: ({ assignment, answers }) => {
            this.assignment.set(assignment);
            this.lessonId.set(assignment.lesson);
            const qs = [...(assignment.questions ?? [])].sort((a, b) => a.order_index - b.order_index);
            const answerMap = new Map(answers.results.map((a) => [a.question, a]));

            this.results.set(
              qs.map((q) => ({
                question: q,
                answer: answerMap.get(q.id) ?? null,
              })),
            );
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  goToLesson(): void {
    const id = this.lessonId();
    if (id) this.router.navigate(['/lessons', id]);
  }

  allAttemptsExhausted(): boolean {
    const a = this.attempt();
    const assign = this.assignment();
    if (!a || !assign) return false;
    return a.attempt_number >= assign.attempts_allowed && !a.is_passed;
  }

  requestReset(): void {
    const student = this.auth.student();
    const assign = this.assignment();
    if (!student || !assign) return;

    this.resetting.set(true);
    this.resetError.set('');
    this.progressService.resetAttempts(student.id, assign.id).subscribe({
      next: () => {
        this.resetting.set(false);
        this.resetDone.set(true);
      },
      error: () => {
        this.resetting.set(false);
        this.resetError.set("So'rovni bajarib bo'lmadi. Keyinroq urinib ko'ring.");
      },
    });
  }

  retryQuiz(): void {
    const assign = this.assignment();
    if (assign) this.router.navigate(['/quiz', assign.id]);
  }

  getScorePercent(): number {
    const a = this.attempt();
    if (!a || !a.max_score) return 0;
    return Math.round(((a.score ?? 0) / a.max_score) * 100);
  }

  getGrade(): string {
    const p = this.getScorePercent();
    if (p >= 86) return '5';
    if (p >= 71) return '4';
    if (p >= 56) return '3';
    return '2';
  }

  getGradeLabel(): string {
    const g = this.getGrade();
    const labels: Record<string, string> = {
      '5': 'A\'lo',
      '4': 'Yaxshi',
      '3': 'Qoniqarli',
      '2': 'Qoniqarsiz',
    };
    return labels[g] ?? '';
  }

  getScoreColor(): string {
    const p = this.getScorePercent();
    if (p >= 86) return 'text-success-400';
    if (p >= 71) return 'text-primary-400';
    if (p >= 56) return 'text-warning-400';
    return 'text-danger-400';
  }

  getCircleColor(): string {
    const p = this.getScorePercent();
    if (p >= 86) return '#22c55e';
    if (p >= 71) return '#6366f1';
    if (p >= 56) return '#f59e0b';
    return '#ef4444';
  }

  getCircleDash(): string {
    const circumference = 2 * Math.PI * 54;
    const filled = (this.getScorePercent() / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  toggleDetails(): void {
    this.showDetails.update((v) => !v);
  }

  formatAnswer(answer: QuestionAnswer | null): string {
    if (!answer?.answer_data) return '—';
    const d = answer.answer_data;
    if (typeof d === 'object') return JSON.stringify(d);
    return String(d);
  }

  formatCorrect(question: Question): string {
    const c = question.correct_answer;
    if (typeof c === 'object') return JSON.stringify(c);
    // Resolve legacy numeric index for multiple choice
    const d = question.question_data as Record<string, unknown>;
    if ('options' in d && /^\d+$/.test(String(c))) {
      const opts = (d['options'] as string[]) ?? [];
      return opts[parseInt(String(c), 10)] ?? String(c);
    }
    return String(c);
  }

  correctCount(): number {
    return this.results().filter((r) => r.answer?.is_correct).length;
  }

  getMotivation(): string {
    const p = this.getScorePercent();
    if (p >= 86) return "Ajoyib natija! Attestatsiyaga tayyor ekaningiz ko'rinib turibdi!";
    if (p >= 71) return "Yaxshi ish! Bir oz mashq qilsangiz mukammal bo'lasiz.";
    if (p >= 56) return "Davom eting! Amaliyot orqali bilimingizni mustahkamlang.";
    return "Tushkunlikka tushmang! Materiallarni qayta ko'rib, yana urinib ko'ring.";
  }
}
