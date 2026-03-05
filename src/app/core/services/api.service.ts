import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          httpParams = httpParams.set(k, v);
        }
      });
    }
    return this.http.get<T>(`${this.base}/${path}/`, { params: httpParams });
  }

  getOne<T>(path: string, id: string): Observable<T> {
    return this.http.get<T>(`${this.base}/${path}/${id}/`);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}/`, body);
  }

  patch<T>(path: string, id: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}/${path}/${id}/`, body);
  }

  put<T>(path: string, id: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/${path}/${id}/`, body);
  }

  delete(path: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${path}/${id}/`);
  }

  uploadFile<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, formData);
  }
}
