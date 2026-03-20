import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-admin-resenas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-resenas.component.html',
  styleUrls: ['./admin-resenas.component.scss']
})
export class AdminResenasComponent implements OnInit {
  resenas: any[] = [];
  loading = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void { this.cargar(); }

  cargar() {
    this.loading = true;
    this.api.get<any[]>('/resenas/reportadas').pipe(first()).subscribe({
      next: (data) => { this.resenas = data || []; this.loading = false; },
      error: () => { this.toast.error('Error al cargar reseñas reportadas'); this.loading = false; }
    });
  }

  eliminar(id: number) {
    if (!confirm('¿Eliminar esta reseña? Ya no será visible para nadie.')) return;
    this.api.delete<any>(`/resenas/${id}`).pipe(first()).subscribe({
      next: () => { this.toast.success('Reseña eliminada correctamente'); this.cargar(); },
      error: () => this.toast.error('No se pudo eliminar la reseña')
    });
  }

  desestimar(id: number) {
    if (!confirm('¿Desestimar el reporte? La reseña volverá a ser pública.')) return;
    this.api.patch<any>(`/resenas/${id}/desestimar-reporte`, {}).pipe(first()).subscribe({
      next: () => { this.toast.success('Reporte desestimado. Reseña restaurada.'); this.cargar(); },
      error: () => this.toast.error('No se pudo desestimar el reporte')
    });
  }

  estrellasArr(n: number): number[] {
    return Array(n).fill(0);
  }

  trackById(i: number, item: any) { return item.id; }
}
