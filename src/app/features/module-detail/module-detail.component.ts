import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ModuleService } from '../../core/services/module.service';
import { ProgressService } from '../../core/services/progress.service';
import { Lesson, Module, StudentLessonProgress, StudentModuleEnrollment } from '../../core/models';

interface LessonWithProgress extends Lesson {
  progress: StudentLessonProgress | null;
  isLocked: boolean;
}

@Component({
  selector: 'app-module-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './module-detail.component.html',
})
export class ModuleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly moduleService = inject(ModuleService);
  private readonly progressService = inject(ProgressService);

  readonly module = signal<Module | null>(null);
  readonly lessons = signal<LessonWithProgress[]>([]);
  readonly enrollment = signal<StudentModuleEnrollment | null>(null);
  readonly loading = signal(true);

  readonly student = this.auth.student;

  ngOnInit(): void {
    const moduleId = this.route.snapshot.paramMap.get('id')!;
    const studentId = this.student()!.id;

    forkJoin({
      module: this.moduleService.getModule(moduleId),
      lessons: this.moduleService.getLessons(moduleId),
      lessonProgress: this.progressService.getStudentLessonProgress(studentId),
      enrollment: this.progressService.getEnrollment(studentId, moduleId),
    }).subscribe({
      next: ({ module, lessons, lessonProgress, enrollment }) => {
        this.module.set(module);
        this.enrollment.set(enrollment);

        const progressMap = new Map(
          lessonProgress.results.map((p) => [p.lesson, p]),
        );

        const sorted = [...lessons.results].sort((a, b) => a.order_index - b.order_index);

        const lessonsWithProgress: LessonWithProgress[] = sorted.map((lesson, idx) => {
          const progress = progressMap.get(lesson.id) ?? null;
          let isLocked = false;

          if (module.is_sequential && idx > 0) {
            const prevLesson = sorted[idx - 1];
            const prevProgress = progressMap.get(prevLesson.id);
            const required = prevLesson.required_completion_percent;
            isLocked = !prevProgress || prevProgress.completion_percent < required;
          }

          return { ...lesson, progress, isLocked };
        });

        this.lessons.set(lessonsWithProgress);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  enrollAndStart(lessonId: string): void {
    const studentId = this.student()!.id;
    const moduleId = this.module()!.id;

    if (!this.enrollment()) {
      this.progressService.enroll(studentId, moduleId).subscribe({
        next: (enrollment) => {
          this.enrollment.set(enrollment);
        },
      });
    }
  }

  getStatusLabel(lesson: LessonWithProgress): string {
    if (lesson.isLocked) return 'Qulflangan';
    const p = lesson.progress;
    if (!p) return 'Boshlanmagan';
    if (p.completion_percent >= lesson.required_completion_percent) return 'Tugallangan';
    return `${p.completion_percent}% bajarildi`;
  }

  getStatusClass(lesson: LessonWithProgress): string {
    if (lesson.isLocked) return 'text-gray-500 bg-gray-800 border-gray-700';
    const p = lesson.progress;
    if (!p) return 'text-gray-400 bg-gray-800 border-gray-700';
    if (p.completion_percent >= lesson.required_completion_percent)
      return 'text-success-500 bg-success-500/10 border-success-500/20';
    return 'text-warning-500 bg-warning-500/10 border-warning-500/20';
  }
}
