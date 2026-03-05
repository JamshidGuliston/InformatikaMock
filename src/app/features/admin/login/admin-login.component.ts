import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TeacherAuthService } from '../../../core/services/teacher-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(TeacherAuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    this.auth
      .login({ email: this.form.value.email!, password: this.form.value.password! })
      .subscribe({
        next: () => this.router.navigate(['/admin/dashboard']),
        error: (err: Error) => {
          this.error.set(err.message || 'Xatolik yuz berdi');
          this.loading.set(false);
        },
      });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }
}
