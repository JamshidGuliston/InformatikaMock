import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { TeacherAuthService } from '../../../core/services/teacher-auth.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { Module, Student, Assignment, PaginatedResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly breadcrumb = inject(BreadcrumbService);
  readonly auth = inject(TeacherAuthService);

  readonly loading = signal(true);
  readonly moduleCount = signal(0);
  readonly studentCount = signal(0);
  readonly assignmentCount = signal(0);
  readonly recentModules = signal<Module[]>([]);

  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Dashboard' }]);
    forkJoin({
      modules: this.api.get<PaginatedResponse<Module>>('modules', { teacher_id: environment.teacherId }),
      students: this.api.get<PaginatedResponse<Student>>('students', { teacher_id: environment.teacherId }),
      assignments: this.api.get<PaginatedResponse<Assignment>>('assignments'),
    }).subscribe({
      next: ({ modules, students, assignments }) => {
        this.moduleCount.set(modules.count);
        this.studentCount.set(students.count);
        this.assignmentCount.set(assignments.count);
        this.recentModules.set(modules.results.slice(0, 5));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
