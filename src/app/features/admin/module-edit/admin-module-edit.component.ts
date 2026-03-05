import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { Module, Lesson, PaginatedResponse } from '../../../core/models';

@Component({
  selector: 'app-admin-module-edit',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-module-edit.component.html',
})
export class AdminModuleEditComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly breadcrumb = inject(BreadcrumbService);

  private moduleId = '';

  readonly loading = signal(true);
  readonly module = signal<Module | null>(null);
  readonly lessons = signal<Lesson[]>([]);
  readonly saving = signal(false);
  readonly savingLesson = signal(false);
  readonly error = signal('');
  readonly lessonError = signal('');
  readonly showLessonForm = signal(false);
  readonly successMsg = signal('');

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    is_sequential: [true],
    is_published: [false],
  });

  readonly lessonForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    required_completion_percent: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
    is_sequential: [true],
    is_published: [false],
  });

  ngOnInit(): void {
    this.moduleId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.api.getOne<Module>('modules', this.moduleId).subscribe({
      next: (mod) => {
        this.module.set(mod);
        this.breadcrumb.set([
          { label: 'Modullar', route: '/admin/modules' },
          { label: mod.title },
        ]);
        this.form.patchValue({
          title: mod.title,
          description: mod.description ?? '',
          is_sequential: mod.is_sequential,
          is_published: mod.is_published,
        });
        this.loadLessons();
      },
      error: () => this.loading.set(false),
    });
  }

  loadLessons(): void {
    this.api
      .get<PaginatedResponse<Lesson>>('lessons', { module_id: this.moduleId })
      .subscribe({
        next: (res) => {
          this.lessons.set(res.results);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  saveModule(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.successMsg.set('');
    this.api.patch<Module>('modules', this.moduleId, this.form.value).subscribe({
      next: (mod) => {
        this.module.set(mod);
        this.saving.set(false);
        this.successMsg.set('Modul saqlandi');
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err.message || 'Xatolik');
        this.saving.set(false);
      },
    });
  }

  toggleLessonForm(): void {
    this.showLessonForm.update((v) => !v);
    if (!this.showLessonForm())
      this.lessonForm.reset({ required_completion_percent: 80, is_sequential: true, is_published: false });
    this.lessonError.set('');
  }

  createLesson(): void {
    if (this.lessonForm.invalid || this.savingLesson()) return;
    this.savingLesson.set(true);
    this.lessonError.set('');
    const payload = {
      ...this.lessonForm.value,
      module: this.moduleId,
      order_index: this.lessons().length + 1,
    };
    this.api.post<Lesson>('lessons', payload).subscribe({
      next: () => {
        this.savingLesson.set(false);
        this.showLessonForm.set(false);
        this.lessonForm.reset({ required_completion_percent: 80, is_sequential: true, is_published: false });
        this.loadLessons();
      },
      error: (err) => {
        this.lessonError.set(err.message || 'Xatolik');
        this.savingLesson.set(false);
      },
    });
  }

  editLesson(lesson: Lesson): void {
    this.router.navigate(['/admin/lessons', lesson.id]);
  }

  deleteLesson(lesson: Lesson): void {
    if (!confirm(`"${lesson.title}" darsini o'chirishni tasdiqlaysizmi?`)) return;
    this.api.delete('lessons', lesson.id).subscribe({
      next: () => this.loadLessons(),
    });
  }

  back(): void {
    this.router.navigate(['/admin/modules']);
  }
}
