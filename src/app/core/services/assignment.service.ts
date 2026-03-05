import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Assignment, PaginatedResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private readonly api = inject(ApiService);

  getAssignments(lessonId: string): Observable<PaginatedResponse<Assignment>> {
    return this.api.get<PaginatedResponse<Assignment>>('assignments', {
      lesson_id: lessonId,
    });
  }

  getAssignment(id: string): Observable<Assignment> {
    return this.api.getOne<Assignment>('assignments', id);
  }
}
