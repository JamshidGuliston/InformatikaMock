import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ModuleService } from '../../core/services/module.service';
import { ProgressService } from '../../core/services/progress.service';
import { Module, StudentModuleEnrollment } from '../../core/models';

interface ModuleWithProgress extends Module {
  enrollment: StudentModuleEnrollment | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly moduleService = inject(ModuleService);
  private readonly progressService = inject(ProgressService);

  readonly student = this.auth.student;
  readonly modules = signal<ModuleWithProgress[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const studentId = this.student()!.id;

    forkJoin({
      modules: this.moduleService.getModules(),
      enrollments: this.progressService.getStudentEnrollments(studentId),
    }).subscribe({
      next: ({ modules, enrollments }) => {
        const enrollmentMap = new Map(
          enrollments.results.map((e) => [e.module, e]),
        );
        this.modules.set(
          modules.results.map((m) => ({
            ...m,
            enrollment: enrollmentMap.get(m.id) ?? null,
          })),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  logout(): void {
    this.auth.logout();
  }

  getProgressColor(percent: number): string {
    if (percent >= 80) return 'bg-success-500';
    if (percent >= 50) return 'bg-warning-500';
    return 'bg-primary-500';
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Xayrli tong';
    if (hour < 17) return 'Xayrli kun';
    return 'Xayrli kech';
  }

  totalCompleted(): number {
    return this.modules().filter((m) => (m.enrollment?.progress_percent ?? 0) >= 100).length;
  }

  overallProgress(): number {
    const mods = this.modules();
    if (!mods.length) return 0;
    const total = mods.reduce((sum, m) => sum + (m.enrollment?.progress_percent ?? 0), 0);
    return Math.round(total / mods.length);
  }
}
