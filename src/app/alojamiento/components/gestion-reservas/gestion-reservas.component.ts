import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import { ReservasService, ReservaDto } from '../../services/reservas.service';
import { first } from 'rxjs/operators';
import { AlojamientoService } from '../../services/alojamiento.service';
import { forkJoin, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';

interface ReservaUI {
  id: number;
  folio?: string;
  hospedaje: string;
  huesped: string;
  fechaEntrada: string;
  fechaSalida: string;
  total: number;
  estado: 'Confirmada' | 'Pendiente' | 'PagoEnRevision' | 'Cancelada' | 'Rechazada';
  alojamientoId?: number;
  comprobanteUrl?: string;
}

@Component({
  selector: 'app-gestion-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-reservas.component.html',
  styleUrl: './gestion-reservas.component.scss'
})
export class GestionReservasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private modalService = inject(ConfirmModalService);
  private reservasService = inject(ReservasService);
  private alojamientosService = inject(AlojamientoService);
  private userService = inject(UserService);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  searchTerm = '';
  hospedajeFiltro: string | null = null;
  estadoFiltro: string = '';
  readonly estadosPosibles: string[] = ['Pendiente','PagoEnRevision','Confirmada','Rechazada','Cancelada'];
  detalleAbierto = false;
  reservaSeleccionada: ReservaUI | null = null;
  // Preview del comprobante
  previewUrl: SafeResourceUrl | null = null;
  previewType: 'pdf' | 'image' | null = null;
  private previewObjectUrl: string | null = null;
  previewError: string | null = null;

  reservas: ReservaUI[] = [];
  loading = false;
  error: string | null = null;
  page = 1;
  pageSize = 8;

  constructor() {
    this.hospedajeFiltro = this.route.snapshot.paramMap.get('id');
  }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar() {
    this.loading = true;
    this.error = null;
    const alojamientoId = this.hospedajeFiltro ? parseInt(this.hospedajeFiltro, 10) : undefined;
    if (alojamientoId) {
      this.reservasService.listByAlojamiento(alojamientoId).pipe(first()).subscribe({
        next: (items: ReservaDto[]) => {
          this.reservas = (items || []).map(this.mapDtoToUI);
          this.loading = false;
          this.cargarClientes();
        },
        error: () => {
          this.error = 'No se pudieron cargar las reservas';
          this.loading = false;
        }
      });
    } else {
      // Agrega todas las reservas de todos los alojamientos del oferente
      this.alojamientosService.listMine().pipe(
        switchMap(list => {
          const ids = (list || []).map(a => a.id).filter(Boolean) as number[];
          if (!ids.length) return of([] as ReservaDto[]);
          return forkJoin(ids.map(id => this.reservasService.listByAlojamiento(id))).pipe(
            map(arrays => arrays.flat())
          );
        }),
        first(),
        catchError(() => {
          this.error = 'No se pudieron cargar las reservas';
          this.loading = false;
          return of([] as ReservaDto[]);
        })
      ).subscribe((items: ReservaDto[]) => {
        this.reservas = (items || []).map(this.mapDtoToUI);
        this.loading = false;
        this.cargarClientes();
      });
    }
  }

  private cargarClientes() {
    const ids = Array.from(new Set(this.reservas.map(r => (r as any)['clienteId']).filter(Boolean)));
    if (!ids.length) return;
    forkJoin(ids.map(id => this.userService.getCliente(id))).pipe(first()).subscribe({
      next: clientes => {
        const mapa = new Map<string, string>();
        clientes.forEach(c => {
          const nombre = c.nombre || c.nombreCompleto || c.email || '(Sin nombre)';
          if (c.id) mapa.set(c.id, nombre);
        });
        this.reservas = this.reservas.map(r => {
          const clienteId = (r as any)['clienteId'];
          return clienteId && mapa.has(clienteId) ? { ...r, huesped: mapa.get(clienteId)! } : r;
        });
      },
      error: () => {
        // Silencioso: si falla mantenemos email o placeholder
      }
    });
  }

  private mapDtoToUI = (r: ReservaDto): ReservaUI => {
    const id = (typeof r.id === 'string') ? parseInt(r.id as string, 10) : (r.id as number) || 0;
    const hospedaje = (r.hospedaje || r.alojamientoNombre || r['alojamiento'] || '');
    const huesped = (r.huesped || r.clienteNombre || r.usuarioEmail || '');
    const total = (typeof r.total === 'number') ? r.total : Number(r['montoTotal'] || 0);
    const estadoRaw = (r.estado || '').toLowerCase();
    // Normaliza estados más comunes provenientes del backend, incluyendo PagoEnRevision
    const estado: ReservaUI['estado'] = estadoRaw.includes('pago') ? 'PagoEnRevision'
      : estadoRaw.includes('pend') ? 'Pendiente'
      : estadoRaw.includes('confirm') || estadoRaw.includes('acept') ? 'Confirmada'
      : estadoRaw.includes('rechaz') ? 'Rechazada'
      : 'Cancelada';
    let comprobanteUrl = (r as any).comprobanteUrl || (r as any).ComprobanteUrl || (r as any).comprobante || (r as any).Comprobante || (r as any).comprobantePath || (r as any).rutaComprobante || '';
    // Si el backend devuelve una ruta relativa como "/comprobantes/xxx",
    // convertirla a una URL absoluta usando la raíz del API (quitando '/api').
    if (comprobanteUrl && !/^https?:\/\//i.test(comprobanteUrl)) {
      if (!comprobanteUrl.startsWith('/')) comprobanteUrl = '/' + comprobanteUrl;
      const apiRoot = this.api.baseUrl.replace(/\/api$/i, '');
      comprobanteUrl = `${apiRoot}${comprobanteUrl}`;
    }
    return {
      id,
      folio: r.folio,
      hospedaje,
      huesped,
      fechaEntrada: r.fechaEntrada || r['checkIn'] || '',
      fechaSalida: r.fechaSalida || r['checkOut'] || '',
      total,
      estado,
      alojamientoId: r.alojamientoId,
      comprobanteUrl: comprobanteUrl || undefined
    };
  }

  comprobanteVerUrl(reserva: ReservaUI): string {
    if (reserva.comprobanteUrl) return reserva.comprobanteUrl;
    // Fallback apunta al endpoint documentado: GET /api/reservas/{id}/comprobante
    const base = this.api.baseUrl.replace(/\/$/, '');
    return `${base}/reservas/${reserva.id}/comprobante`;
  }

  isPdfUrl(reserva: ReservaUI): boolean {
    const url = this.comprobanteVerUrl(reserva) || '';
    return /\.pdf(\?|#|$)/i.test(url);
  }

  pdfSafeUrl(reserva: ReservaUI): SafeResourceUrl {
    const url = this.comprobanteVerUrl(reserva);
    // Oculta toolbar para vista más limpia cuando es compatible
    const withParams = url.includes('#') || url.includes('?') ? url : `${url}#toolbar=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(withParams);
  }

  private cargarComprobantePreview(reserva: ReservaUI) {
    this.previewUrl = null;
    this.previewType = null;
    this.previewError = null;
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }

    this.api.getBlob(`/reservas/${reserva.id}/comprobante`).pipe(first()).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) { this.previewError = 'Sin comprobante'; return; }
        const obj = URL.createObjectURL(blob);
        this.previewObjectUrl = obj;
        this.previewType = (blob.type || '').toLowerCase().includes('pdf') ? 'pdf' : 'image';
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(obj);
      },
      error: (err) => {
        if (err?.status === 404) this.previewError = 'Sin comprobante disponible';
        else if (err?.status === 401) this.previewError = 'Sin permisos para ver el comprobante';
        else this.previewError = 'No se pudo cargar el comprobante';
      }
    });
  }

  descargarComprobante(reserva: ReservaUI) {
    this.api.getBlob(`/reservas/${reserva.id}/comprobante`).pipe(first()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        // Intentar abrir en nueva pestaña; si el navegador bloquea, forzar descarga
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        // Nombre sugerido
        const nombre = `comprobante-reserva-${reserva.folio || reserva.id}`;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        const status = err?.status;
        if (status === 404) {
          this.toastService.info('Esta reserva no tiene comprobante disponible');
        } else if (status === 401) {
          this.toastService.error('Tu sesión expiró o no tienes permisos para ver el comprobante');
        } else {
          this.toastService.error('No se pudo descargar el comprobante');
        }
        console.error('Error al descargar comprobante:', err);
      }
    });
  }

  get filteredReservas(): ReservaUI[] {
    let list = this.reservas;

    if (this.hospedajeFiltro) {
      const id = parseInt(this.hospedajeFiltro, 10);
      list = list.filter(r => r.alojamientoId === id || `${r.hospedaje}` === this.hospedajeFiltro);
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      // Aplica filtro por estado si se seleccionó
      if (this.estadoFiltro) {
        list = list.filter(r => r.estado === this.estadoFiltro);
      }
      return list;
    }

    list = list.filter((r) =>
      [r.folio || r.id, r.huesped, r.estado]
        .some((value) => String(value).toLowerCase().includes(term))
    );

    if (this.estadoFiltro) {
      list = list.filter(r => r.estado === this.estadoFiltro);
    }
    return list;
  }

  get totalReservasFiltradas(): number {
    return this.filteredReservas.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalReservasFiltradas / this.pageSize));
  }

  get pagedReservas(): ReservaUI[] {
    const p = Math.min(this.page, this.totalPages);
    const start = (p - 1) * this.pageSize;
    return this.filteredReservas.slice(start, start + this.pageSize);
  }

  onSearchChange() {
    this.page = 1;
  }

  onEstadoChange() {
    this.page = 1;
  }

  goToPage(next: number) {
    if (next < 1 || next > this.totalPages) return;
    this.page = next;
  }

  abrirDetalle(reserva: ReservaUI) {
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

  confirmar(reserva: ReservaUI) {
    this.reservasService.aceptar(reserva.id).pipe(first()).subscribe({
      next: () => {
        this.toastService.success(`Reserva ${reserva.folio || reserva.id} confirmada exitosamente`);
        this.modalService.confirm({ title: 'Reserva confirmada', message: `Se confirmó la reserva ${reserva.folio || reserva.id}.`, confirmText: 'Aceptar' });
        this.actualizarEstadoLocal(reserva.id, 'Confirmada');
        this.cerrarDetalle();
      },
      error: () => this.toastService.error('No se pudo confirmar la reserva')
    });
  }

  rechazar(reserva: ReservaUI) {
    this.modalService.confirm({
      title: '¿Rechazar reserva?',
      message: `¿Estás seguro de que deseas rechazar la reserva ${reserva.folio || reserva.id}?`,
      confirmText: 'Sí, rechazar',
      cancelText: 'Cancelar',
      isDangerous: true
    }).then(result => {
      if (result) {
        this.reservasService.rechazar(reserva.id).pipe(first()).subscribe({
          next: () => {
            // Estado local: puede ser Rechazada o Cancelada según fallback
            const nuevoEstado = this.reservas.find(r => r.id === reserva.id)?.estado === 'Cancelada' ? 'Cancelada' : 'Rechazada';
            this.toastService.info(`Reserva ${reserva.folio || reserva.id} ${nuevoEstado.toLowerCase()}.`);
            this.modalService.confirm({ title: `Reserva ${nuevoEstado}`, message: `Se marcó la reserva ${reserva.folio || reserva.id} como ${nuevoEstado}.`, confirmText: 'Aceptar' });
            this.actualizarEstadoLocal(reserva.id, nuevoEstado as any);
            this.cerrarDetalle();
          },
          error: () => this.toastService.error('No se pudo rechazar la reserva')
        });
      }
    });
  }

  private actualizarEstadoLocal(id: number, estado: ReservaUI['estado']) {
    const idx = this.reservas.findIndex(r => r.id === id);
    if (idx >= 0) this.reservas[idx] = { ...this.reservas[idx], estado };
  }
}
