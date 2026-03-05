import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TeacherAuthService } from '../services/teacher-auth.service';

export const teacherGuard: CanActivateFn = () => {
  const auth = inject(TeacherAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/admin/login']);
};

export const teacherGuestGuard: CanActivateFn = () => {
  const auth = inject(TeacherAuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  return router.createUrlTree(['/admin/dashboard']);
};
