import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { ReservasService } from '../../services/reservas.service';
import { first, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

interface Reserva {
  id: number;
  alojamiento: string;
  fechaEntrada: string;
  fechaSalida: string;
  huespedes: number;
  total: number;
  estado: 'activa' | 'completada' | 'cancelada';
}

@Component({
  selector: 'app-cliente-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cliente-reservas.component.html',
  styleUrls: ['./cliente-reservas.component.scss']
})
export class ClienteReservasComponent implements OnInit {
  private reservasService = inject(ReservasService);
  private toast = inject(ToastService);
  private api = inject(ApiService);
  private auth = inject(AuthService);

  reservas: Reserva[] = [];
  resenasExistentes = new Set<number>();

  selectedReserva: Reserva | null = null;
  showCancelModal = false;

  // Review modal
  showResenaModal  = false;
  resenaReservaId: number | null = null;
  resenaModel      = { calificacion: 5, comentario: '' };
  submittingResena = false;

  constructor() {}

  ngOnInit(): void {
    this.cargar();
    this.cargarResenas();
  }

  private cargar() {
    this.auth.me().pipe(
      first(),
      switchMap((user: any) => {
        const clienteId = String(user?.id || user?.sub || user?.userId || user?.clienteId || '');
        if (!clienteId) return of([] as any[]);
        return this.reservasService.historialByCliente(clienteId).pipe(first());
      })
    ).subscribe({
      next: (items: any[]) => {
        const mapItem = (it: any): Reserva => {
          const estadoBackend = String(it.estado || it.Estado || '').toLowerCase();
          let estado: Reserva['estado'];
          if (/activa|confirm/i.test(estadoBackend)) {
            estado = 'activa';
          } else if (/cancel/i.test(estadoBackend)) {
            estado = 'cancelada';
          } else {
            estado = 'completada';
          }
          return {
            id: Number(it.id || it.Id || 0),
            alojamiento: it.alojamientoNombre || it.AlojamientoNombre || '',
            fechaEntrada: it.fechaEntrada || it.FechaEntrada || '',
            fechaSalida:  it.fechaSalida  || it.FechaSalida  || '',
            huespedes:    1,
            total:        Number(it.total || it.Total || 0),
            estado
          };
        };
        this.reservas = (items || []).map(mapItem);
      },
      error: () => {
        this.toast.error('No se pudieron cargar tus reservas');
      }
    });
  }

  private cargarResenas() {
    this.api.get<any[]>('/resenas/mias').pipe(first()).subscribe({
      next: (resenas) => {
        this.resenasExistentes = new Set(resenas.map((r: any) => r.reservaId ?? r.ReservaId));
      },
      error: () => {}
    });
  }

  openCancelModal(reserva: Reserva) {
    this.selectedReserva  = reserva;
    this.showCancelModal  = true;
  }

  closeCancelModal() {
    this.showCancelModal  = false;
    this.selectedReserva  = null;
  }

  cancelReserva() {
    if (this.selectedReserva) {
      this.selectedReserva.estado = 'cancelada';
      this.toast.success('Reserva cancelada exitosamente');
      this.closeCancelModal();
    }
  }

  // ── Reviews ───────────────────────────────────────────────────────────

  abrirResena(reservaId: number) {
    this.resenaReservaId = reservaId;
    this.resenaModel     = { calificacion: 5, comentario: '' };
    this.showResenaModal = true;
  }

  cerrarResena() {
    this.showResenaModal  = false;
    this.resenaReservaId  = null;
  }

  setCalificacion(n: number) {
    this.resenaModel.calificacion = n;
  }

  enviarResena() {
    if (!this.resenaReservaId || this.submittingResena) return;
    if (this.resenaModel.comentario.trim().length < 10) {
      this.toast.error('El comentario debe tener al menos 10 caracteres.');
      return;
    }
    this.submittingResena = true;
    this.api.post<any>('/resenas', {
      reservaId:    this.resenaReservaId,
      calificacion: this.resenaModel.calificacion,
      comentario:   this.resenaModel.comentario.trim()
    }).pipe(first()).subscribe({
      next: () => {
        this.resenasExistentes.add(this.resenaReservaId!);
        this.toast.success('Reseña enviada. Será revisada antes de publicarse.');
        this.cerrarResena();
        this.submittingResena = false;
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Error al enviar la reseña.';
        this.toast.error(msg);
        this.submittingResena = false;
      }
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────

  get reservasActivas() {
    return this.reservas.filter(r => r.estado === 'activa');
  }

  get reservasPasadas() {
    return this.reservas.filter(r => r.estado === 'completada' || r.estado === 'cancelada');
  }
}
