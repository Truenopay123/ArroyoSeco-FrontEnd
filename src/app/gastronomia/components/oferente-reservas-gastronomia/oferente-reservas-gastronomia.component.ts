import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReservasGastronomiaService, ReservaGastronomiaDto } from '../../services/reservas-gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';

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

  private reservasService = inject(ReservasGastronomiaService);
  private toast = inject(ToastService);
  private modal = inject(ConfirmModalService);
  private offlineQueue = inject(OfflineQueueService);
  private destroyRef = inject(DestroyRef);

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
        return this.reservas.filter(r => r.estado === 'Pendiente');
      case 'confirmadas':
        return this.reservas.filter(r => r.estado === 'Confirmada');
      default:
        return this.reservas;
    }
  }

  confirmar(id?: number) {
    if (!id) return;
    this.reservasService.confirmar(id).pipe(first()).subscribe({
      next: () => {
        this.toast.success('Reserva confirmada');
        this.modal.confirm({ title: 'Reserva confirmada', message: 'La reserva ha sido confirmada.', confirmText: 'Aceptar' });
        // Actualiza localmente sin recargar todo
        const idx = this.reservas.findIndex(r => r.id === id);
        if (idx >= 0) this.reservas[idx] = { ...this.reservas[idx], estado: 'Confirmada' };
      },
      error: () => this.toast.error('Error al confirmar')
    });
  }

  cancelar(id?: number) {
    if (!id) return;
    this.modal.confirm({
      title: 'Rechazar reserva',
      message: '¿Deseas rechazar esta reserva?',
      confirmText: 'Rechazar',
      cancelText: 'Cancelar',
      isDangerous: true
    }).then(ok => {
      if (!ok) return;
      this.reservasService.cancelar(id).pipe(first()).subscribe({
        next: () => {
          this.toast.success('Reserva rechazada');
          this.modal.confirm({ title: 'Reserva rechazada', message: 'La reserva ha sido rechazada.', confirmText: 'Aceptar' });
          const idx = this.reservas.findIndex(r => r.id === id);
          if (idx >= 0) this.reservas[idx] = { ...this.reservas[idx], estado: 'Cancelada' };
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
