import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResenasGastronomiaService } from '../../services/resenas-gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-oferente-resenas-gastronomia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oferente-resenas-gastronomia.component.html',
  styleUrls: ['./oferente-resenas-gastronomia.component.scss']
})
export class OferenteResenasGastronomiaComponent implements OnInit {
  resenas: any[] = [];
  loading = false;

  // Modal de reporte
  mostrarModalReporte = false;
  resenaSeleccionadaId: number | null = null;
  motivoReporte = '';
  enviandoReporte = false;

  constructor(
    private resenasService: ResenasGastronomiaService,
    private toast: ToastService
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar() {
    this.loading = true;
    this.resenasService.getMisEstablecimientos().pipe(first()).subscribe({
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
    this.resenasService.reportar(this.resenaSeleccionadaId, this.motivoReporte.trim())
      .pipe(first()).subscribe({
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
