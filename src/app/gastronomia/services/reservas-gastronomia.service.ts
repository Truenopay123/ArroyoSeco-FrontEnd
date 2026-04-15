import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';

export interface ReservaGastronomiaDto {
  id?: number;
  folio?: string;
  usuarioId?: string;
  establecimientoId?: number;
  mesaId?: number;
  fecha: string;
  fechaReserva?: string;
  numeroPersonas: number;
  estado?: string;
  total?: number;
  comprobanteUrl?: string;
  establecimientoNombre?: string;
  clienteNombre?: string;
  mesaNumero?: number;
}

@Injectable({ providedIn: 'root' })
export class ReservasGastronomiaService {
  private readonly api = inject(ApiService);

  /** Crear nueva reserva */
  crear(payload: { establecimientoId: number; fecha: string; numeroPersonas: number; mesaId?: number | null }): Observable<any> {
    return this.api.post('/ReservasGastronomia', payload);
  }

  /** Obtener reserva por ID */
  getById(id: number): Observable<ReservaGastronomiaDto> {
    return this.api.get<ReservaGastronomiaDto>(`/ReservasGastronomia/${id}`);
  }

  /** Listar reservas del cliente autenticado */
  listByCliente(clienteId: string): Observable<ReservaGastronomiaDto[]> {
    return this.api.get<ReservaGastronomiaDto[]>(`/ReservasGastronomia/cliente/${clienteId}`);
  }

  /** Reservas activas del cliente/oferente autenticado */
  activas(params?: { establecimientoId?: number; clienteId?: string }): Observable<ReservaGastronomiaDto[]> {
    const q: any = {};
    if (params?.establecimientoId) q.establecimientoId = params.establecimientoId;
    if (params?.clienteId) q.clienteId = params.clienteId;
    return this.api.get<ReservaGastronomiaDto[]>('/ReservasGastronomia/activas', q);
  }

  /** Historial de reservas del cliente/oferente autenticado */
  historial(params?: { establecimientoId?: number; clienteId?: string }): Observable<ReservaGastronomiaDto[]> {
    const q: any = {};
    if (params?.establecimientoId) q.establecimientoId = params.establecimientoId;
    if (params?.clienteId) q.clienteId = params.clienteId;
    return this.api.get<ReservaGastronomiaDto[]>('/ReservasGastronomia/historial', q);
  }

  /** Cambiar estado de reserva */
  cambiarEstado(id: number, estado: string): Observable<any> {
    return this.api.patch(`/ReservasGastronomia/${id}/estado`, { estado });
  }

  /** Cancelar reserva */
  cancelar(id: number): Observable<any> {
    return this.cambiarEstado(id, 'Cancelada');
  }

  /** Confirmar reserva (oferente) */
  confirmar(id: number): Observable<any> {
    return this.cambiarEstado(id, 'Confirmada');
  }

  /** Obtener reserva por folio */
  getByFolio(folio: string): Observable<ReservaGastronomiaDto> {
    return this.api.get<ReservaGastronomiaDto>(`/ReservasGastronomia/folio/${folio}`);
  }

  /** Subir comprobante */
  subirComprobante(reservaId: number, archivo: File): Observable<any> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.api.post(`/ReservasGastronomia/${reservaId}/comprobante`, form);
  }

  /** Reservas de un establecimiento (oferente/admin) */
  listByEstablecimiento(establecimientoId: number): Observable<ReservaGastronomiaDto[]> {
    return this.api.get<ReservaGastronomiaDto[]>(`/ReservasGastronomia/establecimiento/${establecimientoId}`);
  }

  /** Historial de un cliente */
  historialByCliente(clienteId: string): Observable<ReservaGastronomiaDto[]> {
    return this.api.get<ReservaGastronomiaDto[]>(`/ReservasGastronomia/cliente/${clienteId}/historial`);
  }
}
