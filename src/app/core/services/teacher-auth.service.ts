import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Teacher, LoginCredentials } from '../models';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'im_teacher';

@Injectable({ providedIn: 'root' })
export class TeacherAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly teacher = signal<Teacher | null>(this.loadFromStorage());
  readonly isLoggedIn = () => this.teacher() !== null;

  login(credentials: LoginCredentials): Observable<Teacher> {
    return this.http
      .post<Teacher>(`${environment.apiUrl}/teachers/login/`, credentials)
      .pipe(
        tap((teacher) => {
          this.teacher.set(teacher);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(teacher));
        }),
        catchError((err) => {
          const msg = err?.error?.detail || 'Email yoki parol noto\'g\'ri';
          return throwError(() => new Error(msg));
        }),
      );
  }

  logout(): void {
    this.teacher.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/admin/login']);
  }

  private loadFromStorage(): Teacher | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
