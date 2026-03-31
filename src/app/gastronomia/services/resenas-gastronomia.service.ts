import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';

export interface ResenaGastronomiaDto {
  id?: number;
  establecimientoId?: number;
  reservaGastronomiaId?: number;
  clienteId?: string;
  calificacion: number;
  comentario: string;
  estado?: string;
  motivoReporte?: string;
  fechaReporte?: string;
  fechaCreacion?: string;
  establecimientoNombre?: string;
  clienteNombre?: string;
}

@Injectable({ providedIn: 'root' })
export class ResenasGastronomiaService {
  private readonly api = inject(ApiService);

  /** Crear reseña para una reserva completada */
  crear(payload: { reservaGastronomiaId: number; calificacion: number; comentario: string }): Observable<any> {
    return this.api.post('/ResenasGastronomia', payload);
  }

  /** Reseñas públicas de un establecimiento */
  getByEstablecimiento(establecimientoId: number): Observable<any> {
    return this.api.get<any>(`/ResenasGastronomia/establecimiento/${establecimientoId}`);
  }

  /** Reseñas de los establecimientos del oferente autenticado */
  getMisEstablecimientos(): Observable<ResenaGastronomiaDto[]> {
    return this.api.get<ResenaGastronomiaDto[]>('/ResenasGastronomia/mis-establecimientos');
  }

  /** Mis reseñas como cliente */
  getMias(): Observable<ResenaGastronomiaDto[]> {
    return this.api.get<ResenaGastronomiaDto[]>('/ResenasGastronomia/mias');
  }

  /** Todas las reseñas (admin) */
  getAll(): Observable<ResenaGastronomiaDto[]> {
    return this.api.get<ResenaGastronomiaDto[]>('/ResenasGastronomia');
  }

  /** Reportar una reseña */
  reportar(id: number, motivo: string): Observable<any> {
    return this.api.post<any>(`/ResenasGastronomia/${id}/reportar`, { motivo });
  }

  /** Reseñas reportadas (admin) */
  getReportadas(): Observable<ResenaGastronomiaDto[]> {
    return this.api.get<ResenaGastronomiaDto[]>('/ResenasGastronomia/reportadas');
  }

  /** Eliminar reseña (admin) */
  eliminar(id: number): Observable<any> {
    return this.api.delete<any>(`/ResenasGastronomia/${id}`);
  }

  /** Desestimar reporte (admin) */
  desestimarReporte(id: number): Observable<any> {
    return this.api.patch<any>(`/ResenasGastronomia/${id}/desestimar-reporte`, {});
  }

  /** Reservas pendientes de reseña */
  getPendientesDeResena(): Observable<any[]> {
    return this.api.get<any[]>('/ResenasGastronomia/pendientes-de-resena');
  }
}
