import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReservasGastronomiaService, ReservaGastronomiaDto } from '../../services/reservas-gastronomia.service';
import { PagosGastronomiaService } from '../../services/pagos-gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-oferente-reservas-gastronomia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oferente-reservas-gastronomia.component.html',
  styleUrl: './oferente-reservas-gastronomia.component.scss'
})
export class OferenteReservasGastronomiaComponent implements OnInit {
  reservas: ReservaGastronomiaDto[] = [];
  loading = false;
  tab: 'pendientes' | 'confirmadas' | 'todas' = 'pendientes';
  isOffline = !navigator.onLine;

  // Modal de detalle
  detalleAbierto = false;
  reservaSeleccionada: ReservaGastronomiaDto | null = null;
  previewUrl: SafeResourceUrl | null = null;
  previewType: 'pdf' | 'image' | null = null;
  private previewObjectUrl: string | null = null;
  previewError: string | null = null;

  private reservasService = inject(ReservasGastronomiaService);
  private pagosService = inject(PagosGastronomiaService);
  private toast = inject(ToastService);
  private modal = inject(ConfirmModalService);
  private offlineQueue = inject(OfflineQueueService);
  private destroyRef = inject(DestroyRef);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  ngOnInit(): void {
    this.loadReservas();

    // Recargar al sincronizar acciones pendientes (offline → online)
    this.offlineQueue.synced$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadReservas());

    window.addEventListener('online', () => {
      this.isOffline = false;
      this.loadReservas();
    });
    window.addEventListener('offline', () => {
      this.isOffline = true;
    });
  }

  private loadReservas() {
    this.loading = true;
    this.reservasService.activas().pipe(first()).subscribe({
      next: (data) => {
        this.reservas = data || [];
        this.loading = false;
      },
      error: () => {
        if (!navigator.onLine) {
          // Offline: los datos pueden venir del caché del SW
        } else {
          this.toast.error('Error al cargar reservas');
        }
        this.loading = false;
      }
    });
  }

  get filteredReservas() {
    switch (this.tab) {
      case 'pendientes':
        return this.reservas.filter(r => r.estado === 'Pendiente' || r.estado === 'PendienteConfirmacion');
      case 'confirmadas':
        return this.reservas.filter(r => r.estado === 'Confirmada');
      default:
        return this.reservas;
    }
  }

  abrirDetalle(reserva: ReservaGastronomiaDto) {
    this.reservaSeleccionada = { ...reserva };
    this.detalleAbierto = true;
    this.cargarComprobantePreview(reserva);
  }

  cerrarDetalle() {
    this.detalleAbierto = false;
    this.reservaSeleccionada = null;
    this.previewUrl = null;
    this.previewType = null;
    this.previewError = null;
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  private cargarComprobantePreview(reserva: ReservaGastronomiaDto) {
    this.previewUrl = null;
    this.previewType = null;
    this.previewError = null;
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    if (!reserva.id) { this.previewError = 'Sin comprobante disponible'; return; }

    // Obtener datos del comprobante (URL) desde el endpoint JSON
    this.pagosService.getComprobanteReserva(reserva.id).pipe(first()).subscribe({
      next: (data: any) => {
        if (data?.comprobanteUrl) {
          this.previewType = /\.pdf(\?|#|$)/i.test(data.comprobanteUrl) ? 'pdf' : 'image';
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(data.comprobanteUrl);
        } else {
          this.previewError = 'Sin comprobante disponible';
        }
      },
      error: (err: any) => {
        // Fallback: intentar con la URL guardada en la reserva
        if (reserva.comprobanteUrl) {
          this.previewType = /\.pdf(\?|#|$)/i.test(reserva.comprobanteUrl) ? 'pdf' : 'image';
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(reserva.comprobanteUrl);
        } else {
          this.previewError = err?.status === 404 ? 'Sin comprobante disponible' : 'No se pudo cargar el comprobante';
        }
      }
    });
  }

  descargarComprobante(reserva: ReservaGastronomiaDto) {
    if (!reserva.id) return;
    this.pagosService.getComprobanteReserva(reserva.id).pipe(first()).subscribe({
      next: (data: any) => {
        if (data?.comprobanteUrl) {
          window.open(data.comprobanteUrl, '_blank');
        } else {
          this.toast.info('Esta reserva no tiene comprobante disponible');
        }
      },
      error: (err: any) => {
        if (err?.status === 404) this.toast.info('Esta reserva no tiene comprobante disponible');
        else this.toast.error('No se pudo obtener el comprobante');
      }
    });
  }

  confirmar(id?: number) {
    if (!id) return;
    const reserva = this.reservas.find(r => r.id === id);

    // Si tiene comprobante pendiente de revisión, confirmar vía pagos
    if (reserva?.estado === 'PendienteConfirmacion') {
      this.pagosService.getPagosReserva(id).pipe(first()).subscribe({
        next: (pagos: any[]) => {
          const pago = pagos.find((p: any) => (p.estado || '').toLowerCase().includes('pendiente'));
          if (!pago) { this.toast.error('No se encontró pago pendiente de confirmar'); return; }
          this.pagosService.confirmarPago(pago.id).pipe(first()).subscribe({
            next: () => {
              this.toast.success('Pago confirmado');
              const idx = this.reservas.findIndex(r => r.id === id);
              if (idx >= 0) this.reservas[idx] = { ...this.reservas[idx], estado: 'Confirmada' };
              this.cerrarDetalle();
            },
            error: () => this.toast.error('No se pudo confirmar el pago')
          });
        },
        error: () => this.toast.error('No se pudieron obtener los pagos de la reserva')
      });
      return;
    }

    this.reservasService.confirmar(id).pipe(first()).subscribe({
      next: () => {
        this.toast.success('Reserva confirmada');
        this.modal.confirm({ title: 'Reserva confirmada', message: 'La reserva ha sido confirmada.', confirmText: 'Aceptar' });
        const idx = this.reservas.findIndex(r => r.id === id);
        if (idx >= 0) this.reservas[idx] = { ...this.reservas[idx], estado: 'Confirmada' };
        this.cerrarDetalle();
      },
      error: () => this.toast.error('Error al confirmar')
    });
  }

  cancelar(id?: number) {
    if (!id) return;
    const reserva = this.reservas.find(r => r.id === id);

    this.modal.confirm({
      title: 'Rechazar reserva',
      message: '¿Deseas rechazar esta reserva?',
      confirmText: 'Rechazar',
      cancelText: 'Cancelar',
      isDangerous: true
    }).then(ok => {
      if (!ok) return;

      // Si tiene comprobante pendiente, rechazar vía pagos
      if (reserva?.estado === 'PendienteConfirmacion') {
        this.pagosService.getPagosReserva(id).pipe(first()).subscribe({
          next: (pagos: any[]) => {
            const pago = pagos.find((p: any) => (p.estado || '').toLowerCase().includes('pendiente'));
            if (!pago) { this.toast.error('No se encontró pago pendiente'); return; }
            this.pagosService.rechazarPago(pago.id).pipe(first()).subscribe({
              next: () => {
                this.toast.info('Pago rechazado. La reserva vuelve a pendiente.');
                const idx = this.reservas.findIndex(r => r.id === id);
                if (idx >= 0) this.reservas[idx] = { ...this.reservas[idx], estado: 'Pendiente' };
                this.cerrarDetalle();
              },
              error: () => this.toast.error('No se pudo rechazar el pago')
            });
          },
          error: () => this.toast.error('No se pudieron obtener los pagos')
        });
        return;
      }

      this.reservasService.cancelar(id).pipe(first()).subscribe({
        next: () => {
          this.toast.success('Reserva rechazada');
          const idx = this.reservas.findIndex(r => r.id === id);
          if (idx >= 0) this.reservas[idx] = { ...this.reservas[idx], estado: 'Cancelada' };
          this.cerrarDetalle();
        },
        error: () => this.toast.error('Error al rechazar')
      });
    });
  }

  getEstadoClass(estado?: string): string {
    switch (estado?.toLowerCase()) {
      case 'confirmada': return 'confirmada';
      case 'pendiente': return 'pendiente';
      case 'cancelada': return 'cancelada';
      default: return '';
    }
  }
}
