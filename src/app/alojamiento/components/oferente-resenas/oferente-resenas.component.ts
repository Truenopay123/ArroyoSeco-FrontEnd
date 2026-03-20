import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-oferente-resenas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oferente-resenas.component.html',
  styleUrls: ['./oferente-resenas.component.scss']
})
export class OferenteResenasComponent implements OnInit {
  resenas: any[] = [];
  loading = false;

  // Modal de reporte
  mostrarModalReporte = false;
  resenaSeleccionadaId: number | null = null;
  motivoReporte = '';
  enviandoReporte = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void { this.cargar(); }

  cargar() {
    this.loading = true;
    this.api.get<any[]>('/resenas/mis-alojamientos').pipe(first()).subscribe({
      next: (data) => { this.resenas = data || []; this.loading = false; },
      error: () => { this.toast.error('Error al cargar reseñas'); this.loading = false; }
    });
  }

  abrirModalReporte(id: number) {
    this.resenaSeleccionadaId = id;
    this.motivoReporte = '';
    this.mostrarModalReporte = true;
  }

  cerrarModalReporte() {
    this.mostrarModalReporte = false;
    this.resenaSeleccionadaId = null;
    this.motivoReporte = '';
  }

  enviarReporte() {
    if (!this.resenaSeleccionadaId || this.motivoReporte.trim().length < 10) {
      this.toast.error('El motivo debe tener al menos 10 caracteres.');
      return;
    }

    this.enviandoReporte = true;
    this.api.post<any>(`/resenas/${this.resenaSeleccionadaId}/reportar`, {
      motivo: this.motivoReporte.trim()
    }).pipe(first()).subscribe({
      next: () => {
        this.toast.success('Reseña reportada. El Admin la revisará.');
        this.cerrarModalReporte();
        this.cargar();
        this.enviandoReporte = false;
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'No se pudo reportar la reseña';
        this.toast.error(msg);
        this.enviandoReporte = false;
      }
    });
  }

  estrellasArr(n: number): number[] {
    return Array(Math.max(0, n)).fill(0);
  }

  trackById(i: number, item: any) { return item.id; }
}
