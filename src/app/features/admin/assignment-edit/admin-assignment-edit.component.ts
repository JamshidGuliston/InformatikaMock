import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { Assignment, Question, Lesson, Module, PaginatedResponse } from '../../../core/models';

type QuestionKind = 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching' | 'ordering' | 'text';

@Component({
  selector: 'app-admin-assignment-edit',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-assignment-edit.component.html',
})
export class AdminAssignmentEditComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly breadcrumb = inject(BreadcrumbService);

  private assignmentId = '';

  readonly loading = signal(true);
  readonly assignment = signal<Assignment | null>(null);
  readonly questions = signal<Question[]>([]);
  readonly saving = signal(false);
  readonly savingQuestion = signal(false);
  readonly error = signal('');
  readonly successMsg = signal('');
  readonly showQuestionForm = signal(false);
  readonly editingQuestion = signal<Question | null>(null);
  readonly importing = signal(false);
  readonly importResult = signal<{ imported: number; errors: { jadval: number; tur?: string; xato: string }[] } | null>(null);

  // Question type selection for the form
  readonly selectedKind = signal<QuestionKind>('multiple_choice');

  readonly questionKinds: { value: QuestionKind; label: string }[] = [
    { value: 'multiple_choice', label: 'Ko\'p tanlov' },
    { value: 'true_false', label: 'To\'g\'ri/Noto\'g\'ri' },
    { value: 'fill_blank', label: 'Bo\'sh to\'ldirish' },
    { value: 'matching', label: 'Moslashtirish' },
    { value: 'ordering', label: 'Tartibga solish' },
    { value: 'text', label: 'Erkin javob' },
  ];

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    total_points: [100, [Validators.required, Validators.min(1)]],
    time_limit: [30],
    attempts_allowed: [3, [Validators.required, Validators.min(1)]],
    is_published: [true],
  });

  // Question base form
  readonly questionBaseForm = this.fb.group({
    question_text: ['', Validators.required],
    points: [10, [Validators.required, Validators.min(1)]],
    explanation: [''],
  });

  // Multiple choice specific
  readonly mcOptions = this.fb.array([
    this.fb.control('', Validators.required),
    this.fb.control('', Validators.required),
    this.fb.control(''),
    this.fb.control(''),
  ]);
  readonly mcCorrect = signal(0); // index of correct option

  // True/false
  readonly tfCorrect = signal(true);

  // Fill blank
  readonly fbText = this.fb.control('', Validators.required); // text with ____ placeholders
  readonly fbAnswer = this.fb.control('', Validators.required);

  // Matching pairs
  readonly matchPairs = this.fb.array([
    this.fb.group({ left: ['', Validators.required], right: ['', Validators.required] }),
    this.fb.group({ left: ['', Validators.required], right: ['', Validators.required] }),
  ]);

  // Ordering items
  readonly orderItems = this.fb.array([
    this.fb.control('', Validators.required),
    this.fb.control('', Validators.required),
    this.fb.control(''),
    this.fb.control(''),
  ]);

  // Text answer
  readonly textAnswer = this.fb.control('');

  ngOnInit(): void {
    this.assignmentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.api.getOne<Assignment>('assignments', this.assignmentId).subscribe({
      next: (a) => {
        this.assignment.set(a);
        // Load lesson + module for breadcrumb (non-blocking, chained)
        this.api.getOne<Lesson>('lessons', a.lesson).pipe(
          switchMap((lesson) =>
            this.api.getOne<Module>('modules', lesson.module).pipe(
              switchMap((mod) => {
                this.breadcrumb.set([
                  { label: 'Modullar', route: '/admin/modules' },
                  { label: mod.title, route: '/admin/modules/' + lesson.module },
                  { label: lesson.title, route: '/admin/lessons/' + a.lesson },
                  { label: a.title },
                ]);
                return [];
              }),
            ),
          ),
        ).subscribe();
        this.form.patchValue({
          title: a.title,
          description: a.description ?? '',
          total_points: a.total_points,
          time_limit: a.time_limit ?? null,
          attempts_allowed: a.attempts_allowed,
          is_published: a.is_published,
        });
        this.loadQuestions();
      },
      error: () => this.loading.set(false),
    });
  }

  loadQuestions(): void {
    this.api
      .get<PaginatedResponse<Question>>('questions', { assignment_id: this.assignmentId })
      .subscribe({
        next: (res) => {
          this.questions.set(res.results);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  saveAssignment(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.api.patch<Assignment>('assignments', this.assignmentId, this.form.value).subscribe({
      next: (a) => {
        this.assignment.set(a);
        this.saving.set(false);
        this.successMsg.set('Topshiriq saqlandi');
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err.message || 'Xatolik');
        this.saving.set(false);
      },
    });
  }

  setKind(kind: QuestionKind): void {
    this.selectedKind.set(kind);
  }

  toggleQuestionForm(): void {
    this.showQuestionForm.update((v) => !v);
    if (this.showQuestionForm()) this.resetQuestionForm();
  }

  resetQuestionForm(): void {
    this.questionBaseForm.reset({ points: 10 });
    this.mcOptions.reset(['', '', '', '']);
    this.mcCorrect.set(0);
    this.tfCorrect.set(true);
    this.fbText.reset('');
    this.fbAnswer.reset('');
    this.matchPairs.clear();
    this.addMatchPair();
    this.addMatchPair();
    this.orderItems.reset(['', '', '', '']);
    this.textAnswer.reset('');
    this.selectedKind.set('multiple_choice');
    this.editingQuestion.set(null);
  }

  // Helpers for form arrays
  get mcOptionsArr(): FormArray { return this.mcOptions; }
  get matchPairsArr(): FormArray { return this.matchPairs; }
  get orderItemsArr(): FormArray { return this.orderItems; }

  addMatchPair(): void {
    this.matchPairs.push(
      this.fb.group({ left: ['', Validators.required], right: ['', Validators.required] })
    );
  }

  removeMatchPair(i: number): void {
    if (this.matchPairs.length > 2) this.matchPairs.removeAt(i);
  }

  addOrderItem(): void {
    this.orderItems.push(this.fb.control('', Validators.required));
  }

  removeOrderItem(i: number): void {
    if (this.orderItems.length > 2) this.orderItems.removeAt(i);
  }

  buildQuestionPayload(): { question_data: unknown; correct_answer: unknown } | null {
    const kind = this.selectedKind();
    switch (kind) {
      case 'multiple_choice': {
        const opts = (this.mcOptions.value as (string | null)[])
          .filter((o): o is string => !!o && !!o.trim());
        if (opts.length < 2) return null;
        const correctIdx = this.mcCorrect();
        return {
          question_data: { options: opts },
          correct_answer: opts[correctIdx] ?? opts[0],
        };
      }
      case 'true_false': {
        return {
          question_data: { statement: this.questionBaseForm.value.question_text },
          correct_answer: this.tfCorrect() ? 'true' : 'false',
        };
      }
      case 'fill_blank': {
        const text = this.fbText.value ?? '';
        if (!text) return null;
        return {
          question_data: { text, blanks: 1 },
          correct_answer: this.fbAnswer.value,
        };
      }
      case 'matching': {
        type Pair = { left: string; right: string };
        const rawPairs = this.matchPairs.value as Partial<Pair>[];
        const pairs = rawPairs.filter((p): p is Pair => !!p.left && !!p.right);
        if (pairs.length < 2) return null;
        const data: Record<string, string> = {};
        pairs.forEach((p) => { data[p.left] = p.right; });
        return {
          question_data: { pairs },
          correct_answer: data,
        };
      }
      case 'ordering': {
        const items = (this.orderItems.value as (string | null)[])
          .filter((i): i is string => !!i && !!i.trim());
        if (items.length < 2) return null;
        return {
          question_data: { items },
          correct_answer: items.map((_: string, idx: number) => idx),
        };
      }
      case 'text': {
        return {
          question_data: {},
          correct_answer: this.textAnswer.value ?? '',
        };
      }
    }
  }

  saveQuestion(): void {
    if (this.questionBaseForm.invalid || this.savingQuestion()) return;
    const extra = this.buildQuestionPayload();
    if (!extra) return;

    this.savingQuestion.set(true);
    const base = this.questionBaseForm.value;
    const payload = {
      assignment: this.assignmentId,
      question_text: base.question_text,
      points: base.points,
      explanation: base.explanation ?? '',
      order_index: this.questions().length + 1,
      question_data: extra.question_data,
      correct_answer: extra.correct_answer,
    };

    const editing = this.editingQuestion();
    const req$ = editing
      ? this.api.patch<Question>('questions', editing.id, payload)
      : this.api.post<Question>('questions', payload);

    req$.subscribe({
      next: () => {
        this.savingQuestion.set(false);
        this.showQuestionForm.set(false);
        this.editingQuestion.set(null);
        this.loadQuestions();
      },
      error: () => this.savingQuestion.set(false),
    });
  }

  private detectKind(q: Question): QuestionKind {
    const data = q.question_data as Record<string, unknown>;
    if ('options' in data) return 'multiple_choice';
    if ('pairs' in data) return 'matching';
    if ('items' in data) return 'ordering';
    if ('text' in data) return 'fill_blank';
    if ('statement' in data) return 'true_false';
    return 'text';
  }

  editQuestion(q: Question): void {
    const kind = this.detectKind(q);
    const data = q.question_data as Record<string, unknown>;

    this.selectedKind.set(kind);
    this.editingQuestion.set(q);
    this.questionBaseForm.patchValue({
      question_text: q.question_text,
      points: q.points,
      explanation: q.explanation ?? '',
    });

    switch (kind) {
      case 'multiple_choice': {
        const opts = (data['options'] as string[]) ?? [];
        const padded = [...opts, '', '', '', ''].slice(0, 4);
        this.mcOptions.setValue(padded);
        const correctText = String(q.correct_answer ?? '');
        let idx = opts.indexOf(correctText);
        if (idx === -1 && /^\d+$/.test(correctText)) idx = parseInt(correctText, 10);
        this.mcCorrect.set(Math.max(0, idx));
        break;
      }
      case 'true_false': {
        this.tfCorrect.set(String(q.correct_answer) === 'true');
        break;
      }
      case 'fill_blank': {
        this.fbText.setValue((data['text'] as string) ?? '');
        this.fbAnswer.setValue(String(q.correct_answer ?? ''));
        break;
      }
      case 'matching': {
        const pairs = (data['pairs'] as { left: string; right: string }[]) ?? [];
        this.matchPairs.clear();
        pairs.forEach((p) =>
          this.matchPairs.push(
            this.fb.group({ left: [p.left, Validators.required], right: [p.right, Validators.required] }),
          ),
        );
        if (this.matchPairs.length < 2) this.addMatchPair();
        break;
      }
      case 'ordering': {
        const items = (data['items'] as string[]) ?? [];
        while (this.orderItems.length > 0) this.orderItems.removeAt(0);
        const padded = [...items, '', '', ''].slice(0, Math.max(4, items.length));
        padded.forEach((item) => this.orderItems.push(this.fb.control(item)));
        break;
      }
      case 'text': {
        this.textAnswer.setValue(String(q.correct_answer ?? ''));
        break;
      }
    }

    this.showQuestionForm.set(true);
  }

  deleteQuestion(q: Question): void {
    if (!confirm(`Savolni o'chirasizmi?`)) return;
    this.api.delete('questions', q.id).subscribe({ next: () => this.loadQuestions() });
  }

  importDocx(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importing.set(true);
    this.importResult.set(null);
    this.error.set('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('assignment_id', this.assignmentId);
    this.api.uploadFile<{ imported: number; errors: { jadval: number; tur?: string; xato: string }[]; questions: unknown[] }>(
      'questions/import-docx/', fd,
    ).subscribe({
      next: (res) => {
        this.importing.set(false);
        this.importResult.set({ imported: res.imported, errors: res.errors });
        this.loadQuestions();
        // reset file input
        (event.target as HTMLInputElement).value = '';
      },
      error: (err) => {
        this.importing.set(false);
        this.error.set(err?.error?.detail || 'Import xatosi yuz berdi');
        (event.target as HTMLInputElement).value = '';
      },
    });
  }

  back(): void {
    const lessonId = this.assignment()?.lesson;
    if (lessonId) this.router.navigate(['/admin/lessons', lessonId]);
    else this.router.navigate(['/admin/modules']);
  }

  kindLabel(q: Question): string {
    const d = q.question_data as Record<string, unknown>;
    if ('options' in d) return 'Ko\'p tanlov';
    if ('statement' in d) return 'To\'g\'ri/Noto\'g\'ri';
    if ('pairs' in d) return 'Moslashtirish';
    if ('text' in d) return 'Bo\'sh to\'ldirish';
    if ('items' in d) return 'Tartibga solish';
    return 'Erkin javob';
  }
}
