import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { TeacherAuthService } from '../../../core/services/teacher-auth.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  private readonly router = inject(Router);
  readonly auth = inject(TeacherAuthService);
  readonly breadcrumb = inject(BreadcrumbService);
  readonly sidebarOpen = signal(true);

  readonly navItems = [
    { label: 'Dashboard', icon: 'chart', route: '/admin/dashboard' },
    { label: 'Modullar', icon: 'book', route: '/admin/modules' },
    { label: 'Studentlar', icon: 'users', route: '/admin/students' },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
  }

  goToStudentPortal(): void {
    this.router.navigate(['/dashboard']);
  }
}
