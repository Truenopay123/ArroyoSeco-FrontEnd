import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-admin-resenas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-resenas.component.html',
  styleUrls: ['./admin-resenas.component.scss']
})
export class AdminResenasComponent implements OnInit {
  resenas: any[] = [];
  loading        = false;
  filtroEstado   = '';

  readonly estrellas = [1, 2, 3, 4, 5];

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void { this.cargar(); }

  cargar() {
    this.loading = true;
    const url = this.filtroEstado
      ? `/resenas?estado=${encodeURIComponent(this.filtroEstado)}`
      : '/resenas';
    this.api.get<any[]>(url).pipe(first()).subscribe({
      next: (data) => { this.resenas = data || []; this.loading = false; },
      error: () => { this.toast.error('Error al cargar reseñas'); this.loading = false; }
    });
  }

  moderar(id: number, estado: 'Aprobada' | 'Rechazada') {
    this.api.patch<any>(`/resenas/${id}/moderar`, { estado }).pipe(first()).subscribe({
      next: () => {
        this.toast.success(`Reseña ${estado.toLowerCase()}`);
        this.cargar();
      },
      error: () => this.toast.error('No se pudo moderar la reseña')
    });
  }

  eliminar(id: number) {
    if (!confirm('¿Eliminar permanentemente esta reseña?')) return;
    this.api.delete<any>(`/resenas/${id}`).pipe(first()).subscribe({
      next: () => { this.toast.success('Reseña eliminada'); this.cargar(); },
      error: () => this.toast.error('No se pudo eliminar la reseña')
    });
  }

  estrellasArr(n: number): number[] {
    return Array(n).fill(0);
  }

  trackById(i: number, item: any) { return item.id; }
}
