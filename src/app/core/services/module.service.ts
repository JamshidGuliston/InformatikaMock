import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Module, Lesson, LessonContent, PaginatedResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly api = inject(ApiService);

  getModules(): Observable<PaginatedResponse<Module>> {
    return this.api.get<PaginatedResponse<Module>>('modules', {
      teacher_id: environment.teacherId,
    });
  }

  getModule(id: string): Observable<Module> {
    return this.api.getOne<Module>('modules', id);
  }

  getLessons(moduleId: string): Observable<PaginatedResponse<Lesson>> {
    return this.api.get<PaginatedResponse<Lesson>>('lessons', {
      module_id: moduleId,
    });
  }

  getLesson(id: string): Observable<Lesson> {
    return this.api.getOne<Lesson>('lessons', id);
  }

  getLessonContents(lessonId: string): Observable<PaginatedResponse<LessonContent>> {
    return this.api.get<PaginatedResponse<LessonContent>>('lesson-contents', {
      lesson_id: lessonId,
    });
  }
}
