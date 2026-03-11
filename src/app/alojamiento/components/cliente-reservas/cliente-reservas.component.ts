import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { ReservasService } from '../../services/reservas.service';
import { first, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

interface Reserva {
  id: number;
  alojamiento: string;
  fechaEntrada: string;
  fechaSalida: string;
  huespedes: number;
  total: number;
  estadoRaw: string;
  estado: 'pendiente' | 'caducada' | 'activa' | 'completada' | 'cancelada';
}

type FiltroReservas = 'resumen' | 'pendientes' | 'activas' | 'caducadas' | 'completadas' | 'canceladas';
type OrdenReservas = 'proxima-entrada' | 'mas-reciente' | 'precio-mayor';

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
  filtroActual: FiltroReservas = 'resumen';
  busqueda = '';
  ordenActual: OrdenReservas = 'proxima-entrada';

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
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const toDateOnly = (value: string | null | undefined): Date | null => {
          if (!value) return null;
          const raw = String(value).trim();
          const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
          if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
          const fallback = new Date(raw);
          if (Number.isNaN(fallback.getTime())) return null;
          return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
        };

        const mapItem = (it: any): Reserva => {
          const estadoBackend = String(it.estado || it.Estado || '').trim();
          const estadoLower = estadoBackend.toLowerCase();
          const salida = toDateOnly(it.fechaSalida || it.FechaSalida || '');
          const reservaTerminada = !!salida && salida < hoy;

          const esCancelada = /cancel|rechaz/i.test(estadoLower);
          const esCompletada = /complet/i.test(estadoLower);
          const esConfirmada = /confirm|aprob|activa/i.test(estadoLower);

          let estado: Reserva['estado'];
          if (esCancelada) {
            estado = 'cancelada';
          } else if (esConfirmada && reservaTerminada) {
            estado = 'completada';
          } else if (esCompletada) {
            estado = 'completada';
          } else if (esConfirmada) {
            estado = 'activa';
          } else if (reservaTerminada) {
            estado = 'caducada';
          } else {
            estado = 'pendiente';
          }

          return {
            id: Number(it.id || it.Id || 0),
            alojamiento: it.alojamientoNombre || it.AlojamientoNombre || '',
            fechaEntrada: it.fechaEntrada || it.FechaEntrada || '',
            fechaSalida:  it.fechaSalida  || it.FechaSalida  || '',
            huespedes:    Number(it.numeroHuespedes || it.NumeroHuespedes || 1),
            total:        Number(it.total || it.Total || 0),
            estadoRaw: estadoBackend,
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

  setFiltro(filtro: FiltroReservas) {
    this.filtroActual = filtro;
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const raw = String(value).trim();
    const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const fallback = new Date(raw);
    if (Number.isNaN(fallback.getTime())) return null;
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }

  private isSolicitudCaducada(reserva: Reserva): boolean {
    return reserva.estado === 'caducada';
  }

  private filtrarYOrdenar(items: Reserva[]): Reserva[] {
    const term = this.busqueda.trim().toLowerCase();
    let result = term
      ? items.filter(r =>
          r.alojamiento.toLowerCase().includes(term)
          || String(r.id).includes(term)
          || r.estadoRaw.toLowerCase().includes(term))
      : [...items];

    result.sort((a, b) => {
      const entradaA = this.parseDate(a.fechaEntrada)?.getTime() ?? 0;
      const entradaB = this.parseDate(b.fechaEntrada)?.getTime() ?? 0;
      const salidaA = this.parseDate(a.fechaSalida)?.getTime() ?? 0;
      const salidaB = this.parseDate(b.fechaSalida)?.getTime() ?? 0;

      switch (this.ordenActual) {
        case 'mas-reciente':
          return salidaB - salidaA;
        case 'precio-mayor':
          return b.total - a.total;
        default:
          return entradaA - entradaB;
      }
    });

    return result;
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
    return this.filtrarYOrdenar(this.reservas.filter(r => r.estado === 'activa'));
  }

  get reservasPendientes() {
    return this.filtrarYOrdenar(this.reservas.filter(r => r.estado === 'pendiente'));
  }

  get solicitudesCaducadas() {
    return this.filtrarYOrdenar(this.reservas.filter(r => this.isSolicitudCaducada(r)));
  }

  get reservasPasadas() {
    return this.filtrarYOrdenar(this.reservas.filter(r => r.estado === 'completada' || r.estado === 'cancelada'));
  }

  get reservasCompletadas() {
    return this.filtrarYOrdenar(this.reservas.filter(r => r.estado === 'completada'));
  }

  get reservasCanceladas() {
    return this.filtrarYOrdenar(this.reservas.filter(r => r.estado === 'cancelada'));
  }

  get mostrarPendientes() {
    return this.filtroActual === 'resumen' || this.filtroActual === 'pendientes';
  }

  get mostrarActivas() {
    return this.filtroActual === 'resumen' || this.filtroActual === 'activas';
  }

  get mostrarCaducadas() {
    return this.filtroActual === 'caducadas';
  }

  get mostrarHistorial() {
    return this.filtroActual === 'resumen' || this.filtroActual === 'completadas' || this.filtroActual === 'canceladas';
  }

  get historialVisible() {
    if (this.filtroActual === 'completadas') return this.reservasCompletadas;
    if (this.filtroActual === 'canceladas') return this.reservasCanceladas;
    return this.reservasPasadas;
  }
}
