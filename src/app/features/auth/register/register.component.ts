import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student } from '../../../core/models';
import { environment } from '../../../../environments/environment';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group(
    {
      full_name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    const { full_name, email, password } = this.form.value;

    this.api
      .post<Student>('students', {
        teacher: environment.teacherId,
        full_name,
        email,
        password,
      })
      .subscribe({
        next: (student) => {
          // Auto-login after registration
          this.auth.setStudent(student);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          const msg = err?.error?.email?.[0] || err?.error?.detail || 'Ro\'yxatga olishda xato yuz berdi';
          this.error.set(msg);
          this.loading.set(false);
        },
      });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  get passwordMismatch(): boolean {
    return this.form.hasError('mismatch') && !!this.form.get('confirmPassword')?.touched;
  }
}
