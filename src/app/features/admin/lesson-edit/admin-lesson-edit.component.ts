import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { QuillModule } from 'ngx-quill';
import { ApiService } from '../../../core/services/api.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import {
  Lesson, LessonContent, ContentType, Assignment, AssignmentType, Module, PaginatedResponse
} from '../../../core/models';

@Component({
  selector: 'app-admin-lesson-edit',
  standalone: true,
  imports: [ReactiveFormsModule, QuillModule],
  templateUrl: './admin-lesson-edit.component.html',
})
export class AdminLessonEditComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly breadcrumb = inject(BreadcrumbService);

  private lessonId = '';

  readonly loading = signal(true);
  readonly lesson = signal<Lesson | null>(null);
  readonly contents = signal<LessonContent[]>([]);
  readonly assignments = signal<Assignment[]>([]);
  readonly contentTypes = signal<ContentType[]>([]);
  readonly assignmentTypes = signal<AssignmentType[]>([]);

  readonly saving = signal(false);
  readonly savingContent = signal(false);
  readonly savingAssignment = signal(false);
  readonly error = signal('');
  readonly successMsg = signal('');
  readonly showContentForm = signal(false);
  readonly showAssignmentForm = signal(false);
  readonly editingContent = signal<LessonContent | null>(null);

  readonly quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean'],
    ],
  };

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    required_completion_percent: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
    is_sequential: [true],
    is_published: [false],
  });

  readonly contentForm = this.fb.group({
    title: ['', Validators.required],
    content_type: ['', Validators.required],
    content: [''],
    video_url: [''],
    file_url: [''],
  });

  readonly assignmentForm = this.fb.group({
    title: ['', Validators.required],
    assignment_type: ['', Validators.required],
    description: [''],
    total_points: [100, [Validators.required, Validators.min(1)]],
    time_limit: [30],
    attempts_allowed: [3, [Validators.required, Validators.min(1)]],
    is_published: [true],
  });

  ngOnInit(): void {
    this.lessonId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    forkJoin({
      lesson: this.api.getOne<Lesson>('lessons', this.lessonId),
      contents: this.api.get<PaginatedResponse<LessonContent>>('lesson-contents', { lesson_id: this.lessonId }),
      assignments: this.api.get<PaginatedResponse<Assignment>>('assignments', { lesson_id: this.lessonId }),
      contentTypes: this.api.get<PaginatedResponse<ContentType>>('content-types'),
      assignmentTypes: this.api.get<PaginatedResponse<AssignmentType>>('assignment-types'),
    }).subscribe({
      next: ({ lesson, contents, assignments, contentTypes, assignmentTypes }) => {
        this.lesson.set(lesson);
        // Load module title for breadcrumb (non-blocking)
        this.api.getOne<Module>('modules', lesson.module).subscribe((mod) => {
          this.breadcrumb.set([
            { label: 'Modullar', route: '/admin/modules' },
            { label: mod.title, route: '/admin/modules/' + lesson.module },
            { label: lesson.title },
          ]);
        });
        this.form.patchValue({
          title: lesson.title,
          description: lesson.description ?? '',
          required_completion_percent: lesson.required_completion_percent,
          is_sequential: lesson.is_sequential,
          is_published: lesson.is_published,
        });
        this.contents.set(contents.results);
        this.assignments.set(assignments.results);
        this.contentTypes.set(contentTypes.results);
        this.assignmentTypes.set(assignmentTypes.results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveLesson(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.successMsg.set('');
    this.api.patch<Lesson>('lessons', this.lessonId, this.form.value).subscribe({
      next: (lesson) => {
        this.lesson.set(lesson);
        this.saving.set(false);
        this.successMsg.set('Dars saqlandi');
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err.message || 'Xatolik');
        this.saving.set(false);
      },
    });
  }

  toggleContentForm(): void {
    this.showContentForm.update((v) => !v);
    if (!this.showContentForm()) {
      this.contentForm.reset();
      this.editingContent.set(null);
    }
  }

  editContent(c: LessonContent): void {
    this.editingContent.set(c);
    this.contentForm.patchValue({
      title: c.title,
      content_type: c.content_type?.id ?? '',
      content: c.content ?? '',
      video_url: c.video_url ?? '',
      file_url: c.file_url ?? '',
    });
    this.showContentForm.set(true);
  }

  saveContent(): void {
    if (this.contentForm.invalid || this.savingContent()) return;
    this.savingContent.set(true);
    const v = this.contentForm.value;
    const editing = this.editingContent();
    const payload = {
      lesson: this.lessonId,
      content_type: v.content_type,
      title: v.title,
      content: v.content || null,
      video_url: v.video_url || null,
      file_url: v.file_url || null,
      order_index: editing ? editing.order_index : this.contents().length + 1,
    };
    const req$ = editing
      ? this.api.patch<LessonContent>('lesson-contents', editing.id, payload)
      : this.api.post<LessonContent>('lesson-contents', payload);
    req$.subscribe({
      next: () => {
        this.savingContent.set(false);
        this.showContentForm.set(false);
        this.editingContent.set(null);
        this.contentForm.reset();
        this.api
          .get<PaginatedResponse<LessonContent>>('lesson-contents', { lesson_id: this.lessonId })
          .subscribe((res) => this.contents.set(res.results));
      },
      error: () => this.savingContent.set(false),
    });
  }

  deleteContent(c: LessonContent): void {
    if (!confirm(`"${c.title}" kontentini o'chirasizmi?`)) return;
    this.api.delete('lesson-contents', c.id).subscribe({
      next: () =>
        this.api
          .get<PaginatedResponse<LessonContent>>('lesson-contents', { lesson_id: this.lessonId })
          .subscribe((res) => this.contents.set(res.results)),
    });
  }

  toggleAssignmentForm(): void {
    this.showAssignmentForm.update((v) => !v);
    if (!this.showAssignmentForm())
      this.assignmentForm.reset({ total_points: 100, time_limit: 30, attempts_allowed: 3, is_published: true });
  }

  createAssignment(): void {
    if (this.assignmentForm.invalid || this.savingAssignment()) return;
    this.savingAssignment.set(true);
    const v = this.assignmentForm.value;
    const payload = {
      lesson: this.lessonId,
      assignment_type: v.assignment_type,
      title: v.title,
      description: v.description || '',
      total_points: v.total_points,
      time_limit: v.time_limit || null,
      attempts_allowed: v.attempts_allowed,
      is_published: v.is_published,
      order_index: this.assignments().length + 1,
    };
    this.api.post<Assignment>('assignments', payload).subscribe({
      next: () => {
        this.savingAssignment.set(false);
        this.showAssignmentForm.set(false);
        this.assignmentForm.reset({ total_points: 100, time_limit: 30, attempts_allowed: 3, is_published: false });
        this.api
          .get<PaginatedResponse<Assignment>>('assignments', { lesson_id: this.lessonId })
          .subscribe((res) => this.assignments.set(res.results));
      },
      error: () => this.savingAssignment.set(false),
    });
  }

  editAssignment(a: Assignment): void {
    this.router.navigate(['/admin/assign', a.id]);
  }

  deleteAssignment(a: Assignment): void {
    if (!confirm(`"${a.title}" topshirig'ini o'chirasizmi?`)) return;
    this.api.delete('assignments', a.id).subscribe({
      next: () =>
        this.api
          .get<PaginatedResponse<Assignment>>('assignments', { lesson_id: this.lessonId })
          .subscribe((res) => this.assignments.set(res.results)),
    });
  }

  back(): void {
    const moduleId = this.lesson()?.module;
    if (moduleId) this.router.navigate(['/admin/modules', moduleId]);
    else this.router.navigate(['/admin/modules']);
  }

  getContentTypeName(id: string): string {
    return this.contentTypes().find((ct) => ct.id === id)?.name ?? id;
  }
}
