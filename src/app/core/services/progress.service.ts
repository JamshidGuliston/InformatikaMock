import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import {
  AssignmentAttempt,
  PaginatedResponse,
  QuestionAnswer,
  StudentLessonProgress,
  StudentModuleEnrollment,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly api = inject(ApiService);

  // ---- Enrollment ----
  getEnrollment(studentId: string, moduleId: string): Observable<StudentModuleEnrollment | null> {
    return this.api
      .get<PaginatedResponse<StudentModuleEnrollment>>('enrollments', {
        student_id: studentId,
        module_id: moduleId,
      })
      .pipe(map((r) => r.results[0] ?? null));
  }

  enroll(studentId: string, moduleId: string): Observable<StudentModuleEnrollment> {
    return this.api.post<StudentModuleEnrollment>('enrollments', {
      student: studentId,
      module: moduleId,
    });
  }

  getStudentEnrollments(studentId: string): Observable<PaginatedResponse<StudentModuleEnrollment>> {
    return this.api.get<PaginatedResponse<StudentModuleEnrollment>>('enrollments', {
      student_id: studentId,
    });
  }

  // ---- Lesson Progress ----
  getLessonProgress(studentId: string, lessonId: string): Observable<StudentLessonProgress | null> {
    return this.api
      .get<PaginatedResponse<StudentLessonProgress>>('lesson-progress', {
        student_id: studentId,
        lesson_id: lessonId,
      })
      .pipe(map((r) => r.results[0] ?? null));
  }

  getStudentLessonProgress(studentId: string): Observable<PaginatedResponse<StudentLessonProgress>> {
    return this.api.get<PaginatedResponse<StudentLessonProgress>>('lesson-progress', {
      student_id: studentId,
    });
  }

  startLesson(studentId: string, lessonId: string): Observable<StudentLessonProgress> {
    return this.getLessonProgress(studentId, lessonId).pipe(
      switchMap((existing) => {
        if (existing) return of(existing);
        return this.api.post<StudentLessonProgress>('lesson-progress', {
          student: studentId,
          lesson: lessonId,
          is_unlocked: true,
          started_at: new Date().toISOString(),
          completion_percent: 0,
        });
      }),
    );
  }

  updateLessonProgress(id: string, completionPercent: number): Observable<StudentLessonProgress> {
    const body: Partial<StudentLessonProgress> = { completion_percent: completionPercent };
    if (completionPercent >= 100) {
      body.completed_at = new Date().toISOString();
    }
    return this.api.patch<StudentLessonProgress>('lesson-progress', id, body);
  }

  // ---- Assignment Attempts ----
  getAttempts(studentId: string, assignmentId: string): Observable<PaginatedResponse<AssignmentAttempt>> {
    return this.api.get<PaginatedResponse<AssignmentAttempt>>('attempts', {
      student_id: studentId,
      assignment_id: assignmentId,
    });
  }

  startAttempt(studentId: string, assignmentId: string, attemptNumber: number, maxScore: number): Observable<AssignmentAttempt> {
    return this.api.post<AssignmentAttempt>('attempts', {
      student: studentId,
      assignment: assignmentId,
      attempt_number: attemptNumber,
      max_score: maxScore,
    });
  }

  submitAttempt(attemptId: string, score: number, maxScore: number, isPassed: boolean): Observable<AssignmentAttempt> {
    const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : '0.00';
    return this.api.patch<AssignmentAttempt>('attempts', attemptId, {
      submitted_at: new Date().toISOString(),
      score,
      max_score: maxScore,
      percentage,
      is_passed: isPassed,
    });
  }

  // ---- Question Answers ----
  saveAnswer(
    attemptId: string,
    questionId: string,
    answerData: unknown,
    isCorrect: boolean,
    pointsEarned: number,
  ): Observable<QuestionAnswer> {
    return this.api.post<QuestionAnswer>('answers', {
      attempt: attemptId,
      question: questionId,
      answer_data: answerData,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    });
  }

  getAnswers(attemptId: string): Observable<PaginatedResponse<QuestionAnswer>> {
    return this.api.get<PaginatedResponse<QuestionAnswer>>('answers', {
      attempt_id: attemptId,
    });
  }

  // ---- Reset attempts (delete all for student+assignment) ----
  resetAttempts(studentId: string, assignmentId: string): Observable<void> {
    return this.getAttempts(studentId, assignmentId).pipe(
      switchMap((res) => {
        if (res.results.length === 0) return of(undefined as void);
        return forkJoin(res.results.map((a) => this.api.delete('attempts', a.id))).pipe(
          map(() => undefined as void),
        );
      }),
    );
  }

  // ---- Submit full attempt with all answers ----
  submitFullAttempt(
    attemptId: string,
    answers: { questionId: string; answerData: unknown; isCorrect: boolean; pointsEarned: number }[],
    score: number,
    maxScore: number,
    isPassed: boolean,
  ): Observable<AssignmentAttempt> {
    const answerRequests = answers.map((a) =>
      this.saveAnswer(attemptId, a.questionId, a.answerData, a.isCorrect, a.pointsEarned),
    );
    return forkJoin(answerRequests.length > 0 ? answerRequests : [of(null)]).pipe(
      switchMap(() => this.submitAttempt(attemptId, score, maxScore, isPassed)),
    );
  }
}
