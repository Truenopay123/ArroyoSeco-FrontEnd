import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReservasGastronomiaService, ReservaGastronomiaDto } from '../../services/reservas-gastronomia.service';
import { ResenasGastronomiaService } from '../../services/resenas-gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-cliente-reservas-gastronomia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente-reservas-gastronomia.component.html',
  styleUrl: './cliente-reservas-gastronomia.component.scss'
})
export class ClienteReservasGastronomiaComponent implements OnInit {
  reservasActivas: ReservaGastronomiaDto[] = [];
  reservasHistorial: ReservaGastronomiaDto[] = [];
  loading = false;
  activeTab: 'activas' | 'historial' = 'activas';
  isOffline = !navigator.onLine;

  // Pendientes de reseña
  pendientesDeResena: Set<number> = new Set();

  // Modal de reseña
  mostrarModalResena = false;
  resenaReservaId: number | null = null;
  resenaCalificacion = 5;
  resenaComentario = '';
  enviandoResena = false;

  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private reservasService: ReservasGastronomiaService,
    private resenasService: ResenasGastronomiaService,
    private toast: ToastService,
    private confirmModal: ConfirmModalService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReservas();
    this.loadPendientesDeResena();

    // Recargar al sincronizar acciones pendientes (offline → online)
    this.offlineQueue.synced$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadReservas();
        this.loadPendientesDeResena();
      });

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

    // Cargar reservas activas
    this.reservasService.activas().pipe(first()).subscribe({
      next: (data) => {
        this.reservasActivas = data || [];
      },
      error: () => {
        if (!navigator.onLine) {
          // Offline: los datos pueden venir del caché del SW
        } else {
          this.toast.error('Error al cargar reservas activas');
        }
      }
    });

    // Cargar historial
    this.reservasService.historial().pipe(first()).subscribe({
      next: (data) => {
        this.reservasHistorial = data || [];
        this.loading = false;
      },
      error: () => {
        if (!navigator.onLine) {
          // Offline: los datos pueden venir del caché del SW
        } else {
          this.toast.error('Error al cargar historial');
        }
        this.loading = false;
      }
    });
  }

  async cancelarReserva(reserva: ReservaGastronomiaDto) {
    if (!reserva.id) return;
    const confirmed = await this.confirmModal.confirm({
      title: 'Cancelar reserva',
      message: '¿Estás seguro de cancelar esta reserva?',
      confirmText: 'Cancelar reserva',
      cancelText: 'Volver',
      isDangerous: true
    });
    if (!confirmed) return;

    this.reservasService.cancelar(reserva.id).pipe(first()).subscribe({
      next: () => {
        this.toast.success('Reserva cancelada');
        this.loadReservas();
      },
      error: () => {
        this.toast.error('Error al cancelar la reserva');
      }
    });
  }

  getEstadoClass(estado?: string): string {
    switch (estado?.toLowerCase()) {
      case 'confirmada': return 'estado-confirmada';
      case 'pendiente': return 'estado-pendiente';
      case 'cancelada': return 'estado-cancelada';
      case 'completada': return 'estado-completada';
      default: return '';
    }
  }

  private loadPendientesDeResena() {
    this.resenasService.getPendientesDeResena().pipe(first()).subscribe({
      next: (data) => {
        this.pendientesDeResena = new Set((data || []).map((r: any) => r.id || r.reservaGastronomiaId));
      },
      error: () => {}
    });
  }

  irAPagar(reserva: ReservaGastronomiaDto) {
    this.router.navigate(['/cliente/gastronomia/checkout'], {
      queryParams: {
        reservaId: reserva.id,
        restaurantName: reserva.establecimientoNombre,
        personas: reserva.numeroPersonas,
        fecha: reserva.fecha,
        total: reserva.total
      }
    });
  }

  puedeResenar(reserva: ReservaGastronomiaDto): boolean {
    return this.pendientesDeResena.has(reserva.id!);
  }

  abrirModalResena(reservaId: number) {
    this.resenaReservaId = reservaId;
    this.resenaCalificacion = 5;
    this.resenaComentario = '';
    this.mostrarModalResena = true;
  }

  cerrarModalResena() {
    this.mostrarModalResena = false;
    this.resenaReservaId = null;
  }

  enviarResena() {
    if (!this.resenaReservaId || this.resenaComentario.trim().length < 5) {
      this.toast.error('El comentario debe tener al menos 5 caracteres.');
      return;
    }

    this.enviandoResena = true;
    this.resenasService.crear({
      reservaGastronomiaId: this.resenaReservaId,
      calificacion: this.resenaCalificacion,
      comentario: this.resenaComentario.trim()
    }).pipe(first()).subscribe({
      next: () => {
        this.toast.success('¡Reseña enviada! Gracias por tu opinión.');
        this.cerrarModalResena();
        this.loadPendientesDeResena();
        this.enviandoResena = false;
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'No se pudo enviar la reseña');
        this.enviandoResena = false;
      }
    });
  }

  estrellasArr(n: number): number[] {
    return Array(Math.max(0, n)).fill(0);
  }
}
