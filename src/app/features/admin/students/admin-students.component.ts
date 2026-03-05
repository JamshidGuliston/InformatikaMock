import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { Student, PaginatedResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-students',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-students.component.html',
})
export class AdminStudentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly breadcrumb = inject(BreadcrumbService);

  readonly loading = signal(true);
  readonly students = signal<Student[]>([]);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Studentlar' }]);
    this.loadStudents();
  }

  loadStudents(): void {
    this.loading.set(true);
    this.api
      .get<PaginatedResponse<Student>>('students', { teacher_id: environment.teacherId })
      .subscribe({
        next: (res) => {
          this.students.set(res.results);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) this.form.reset();
    this.error.set('');
  }

  create(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const payload = { ...this.form.value, teacher: environment.teacherId, is_active: true };
    this.api.post<Student>('students', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form.reset();
        this.loadStudents();
      },
      error: (err) => {
        this.error.set(err.message || 'Xatolik yuz berdi');
        this.saving.set(false);
      },
    });
  }

  toggleActive(student: Student): void {
    this.api.patch<Student>('students', student.id, { is_active: !student.is_active }).subscribe({
      next: (updated) => {
        this.students.update((list) =>
          list.map((s) => (s.id === updated.id ? updated : s))
        );
      },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('uz-UZ');
  }
}
