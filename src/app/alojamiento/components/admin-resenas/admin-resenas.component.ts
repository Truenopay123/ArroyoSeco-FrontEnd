import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
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

  constructor(private api: ApiService, private toast: ToastService, private confirmModal: ConfirmModalService) {}

  ngOnInit(): void { this.cargar(); }

  cargar() {
    this.loading = true;
    this.api.get<any[]>('/resenas/reportadas').pipe(first()).subscribe({
      next: (data) => { this.resenas = data || []; this.loading = false; },
      error: () => { this.toast.error('Error al cargar reseñas reportadas'); this.loading = false; }
    });
  }

  async eliminar(id: number) {
    const ok = await this.confirmModal.confirm({ title: 'Eliminar reseña', message: '¿Eliminar esta reseña? Ya no será visible para nadie.', confirmText: 'Eliminar', cancelText: 'Cancelar', isDangerous: true });
    if (!ok) return;
    this.api.delete<any>(`/resenas/${id}`).pipe(first()).subscribe({
      next: () => { this.toast.success('Reseña eliminada correctamente'); this.cargar(); },
      error: () => this.toast.error('No se pudo eliminar la reseña')
    });
  }

  async desestimar(id: number) {
    const ok = await this.confirmModal.confirm({ title: 'Desestimar reporte', message: '¿Desestimar el reporte? La reseña volverá a ser pública.', confirmText: 'Desestimar', cancelText: 'Cancelar' });
    if (!ok) return;
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
