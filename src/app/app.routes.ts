import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { teacherGuard, teacherGuestGuard } from './core/guards/teacher.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'modules/:id',
    loadComponent: () =>
      import('./features/module-detail/module-detail.component').then((m) => m.ModuleDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: 'lessons/:id',
    loadComponent: () =>
      import('./features/lesson-detail/lesson-detail.component').then((m) => m.LessonDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: 'quiz/:id',
    loadComponent: () =>
      import('./features/quiz/quiz.component').then((m) => m.QuizComponent),
    canActivate: [authGuard],
  },
  {
    path: 'results/:id',
    loadComponent: () =>
      import('./features/results/results.component').then((m) => m.ResultsComponent),
    canActivate: [authGuard],
  },
  // ===== Admin routes =====
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
    canActivate: [teacherGuestGuard],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
        canActivate: [teacherGuard],
      },
      {
        path: 'modules',
        loadComponent: () =>
          import('./features/admin/modules/admin-modules.component').then((m) => m.AdminModulesComponent),
        canActivate: [teacherGuard],
      },
      {
        path: 'modules/:id',
        loadComponent: () =>
          import('./features/admin/module-edit/admin-module-edit.component').then((m) => m.AdminModuleEditComponent),
        canActivate: [teacherGuard],
      },
      {
        path: 'lessons/:id',
        loadComponent: () =>
          import('./features/admin/lesson-edit/admin-lesson-edit.component').then((m) => m.AdminLessonEditComponent),
        canActivate: [teacherGuard],
      },
      {
        path: 'assign/:id',
        loadComponent: () =>
          import('./features/admin/assignment-edit/admin-assignment-edit.component').then((m) => m.AdminAssignmentEditComponent),
        canActivate: [teacherGuard],
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/admin/students/admin-students.component').then((m) => m.AdminStudentsComponent),
        canActivate: [teacherGuard],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
