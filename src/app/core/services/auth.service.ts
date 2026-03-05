import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Student, LoginCredentials } from '../models';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'im_student';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly student = signal<Student | null>(this.loadFromStorage());
  readonly isLoggedIn = () => this.student() !== null;

  login(credentials: LoginCredentials): Observable<Student> {
    return this.http
      .post<Student>(`${environment.apiUrl}/students/login/`, credentials)
      .pipe(
        tap((student) => {
          this.student.set(student);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(student));
        }),
        catchError((err) => {
          const msg = err?.error?.detail || 'Email yoki parol noto\'g\'ri';
          return throwError(() => new Error(msg));
        }),
      );
  }

  setStudent(student: Student): void {
    this.student.set(student);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(student));
  }

  logout(): void {
    this.student.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  private loadFromStorage(): Student | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
