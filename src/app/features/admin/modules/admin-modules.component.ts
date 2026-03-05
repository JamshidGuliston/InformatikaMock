import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { Module, PaginatedResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-modules',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-modules.component.html',
})
export class AdminModulesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly breadcrumb = inject(BreadcrumbService);

  readonly loading = signal(true);
  readonly modules = signal<Module[]>([]);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    is_sequential: [true],
    is_published: [false],
  });

  ngOnInit(): void {
    this.breadcrumb.set([{ label: 'Modullar' }]);
    this.loadModules();
  }

  loadModules(): void {
    this.loading.set(true);
    this.api
      .get<PaginatedResponse<Module>>('modules', { teacher_id: environment.teacherId })
      .subscribe({
        next: (res) => {
          this.modules.set(res.results);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) this.form.reset({ is_sequential: true, is_published: false });
    this.error.set('');
  }

  create(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const payload = {
      ...this.form.value,
      teacher: environment.teacherId,
      order_index: this.modules().length + 1,
    };
    this.api.post<Module>('modules', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form.reset({ is_sequential: true, is_published: false });
        this.loadModules();
      },
      error: (err) => {
        this.error.set(err.message || 'Xatolik yuz berdi');
        this.saving.set(false);
      },
    });
  }

  edit(mod: Module): void {
    this.router.navigate(['/admin/modules', mod.id]);
  }

  delete(mod: Module): void {
    if (!confirm(`"${mod.title}" modulini o'chirishni tasdiqlaysizmi?`)) return;
    this.api.delete('modules', mod.id).subscribe({
      next: () => this.loadModules(),
    });
  }
}
