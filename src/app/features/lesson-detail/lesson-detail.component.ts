import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ModuleService } from '../../core/services/module.service';
import { AssignmentService } from '../../core/services/assignment.service';
import { ProgressService } from '../../core/services/progress.service';
import { Assignment, Lesson, LessonContent, StudentLessonProgress } from '../../core/models';

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lesson-detail.component.html',
})
export class LessonDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly moduleService = inject(ModuleService);
  private readonly assignmentService = inject(AssignmentService);
  private readonly progressService = inject(ProgressService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly lesson = signal<Lesson | null>(null);
  readonly contents = signal<LessonContent[]>([]);
  readonly assignments = signal<Assignment[]>([]);
  readonly progress = signal<StudentLessonProgress | null>(null);
  readonly loading = signal(true);
  readonly activeTab = signal<'content' | 'assignments'>('content');
  readonly activeContentIdx = signal(0);

  readonly student = this.auth.student;

  ngOnInit(): void {
    const lessonId = this.route.snapshot.paramMap.get('id')!;
    const studentId = this.student()!.id;

    forkJoin({
      lesson: this.moduleService.getLesson(lessonId),
      contents: this.moduleService.getLessonContents(lessonId),
      assignments: this.assignmentService.getAssignments(lessonId),
    }).subscribe({
      next: ({ lesson, contents, assignments }) => {
        this.lesson.set(lesson);
        this.contents.set(contents.results);
        this.assignments.set(assignments.results);
        this.loading.set(false);

        // Start lesson progress
        this.progressService.startLesson(studentId, lessonId).subscribe({
          next: (progress) => this.progress.set(progress),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: 'content' | 'assignments'): void {
    this.activeTab.set(tab);
  }

  nextContent(): void {
    if (this.activeContentIdx() < this.contents().length - 1) {
      this.activeContentIdx.update((i) => i + 1);
    }
  }

  prevContent(): void {
    if (this.activeContentIdx() > 0) {
      this.activeContentIdx.update((i) => i - 1);
    }
  }

  getContentIcon(typeName: string): string {
    const name = typeName?.toLowerCase() ?? '';
    if (name.includes('video')) return 'video';
    if (name.includes('text') || name.includes('matn')) return 'text';
    if (name.includes('book') || name.includes('kitob')) return 'book';
    if (name.includes('present')) return 'presentation';
    return 'file';
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getYoutubeEmbedUrl(url: string): SafeResourceUrl {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?]+)/);
    const id = match ? match[1] : '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${id}`);
  }

  isYoutube(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  completedAssignments(): number {
    return 0; // Will be enhanced with real data
  }
}
