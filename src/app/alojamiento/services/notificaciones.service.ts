import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpHeaders } from '@angular/common/http';

export interface NotificacionDto {
  id: number | string;
  mensaje: string;
  titulo?: string;
  fecha?: string;
  leida?: boolean;
  tipo?: string;
  urlAccion?: string;
  reservaFolio?: string;
  alojamientoNombre?: string;
}

export interface NotificacionesPagedResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: NotificacionDto[];
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly api = inject(ApiService);

  list(soloNoLeidas = false): Observable<NotificacionDto[]> {
    const q = { soloNoLeidas };
    // Intento principal en minúsculas; si falla, probar variante con mayúscula
    return this.api.get<NotificacionDto[]>(`/notificaciones`, q).pipe(
      catchError(() => this.api.get<NotificacionDto[]>(`/Notificaciones`, q))
    );
  }

  listPaged(params?: {
    page?: number;
    pageSize?: number;
    soloNoLeidas?: boolean;
    from?: string;
    to?: string;
  }): Observable<NotificacionesPagedResponse> {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params?.pageSize ?? 10));
    const q: any = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 10,
      soloNoLeidas: params?.soloNoLeidas ?? false
    };
    if (params?.from) q.from = params.from;
    if (params?.to) q.to = params.to;

    return this.api.get<NotificacionesPagedResponse>('/notificaciones/paged', q).pipe(
      catchError((err) => {
        // Fallback para ambientes con backend desactualizado o sin endpoint paginado.
        if (err?.status !== 404 && err?.status !== 405) {
          return throwError(() => err);
        }

        return this.list(params?.soloNoLeidas ?? false).pipe(
          map((all) => {
            const fromDate = params?.from ? new Date(`${params.from}T00:00:00`) : null;
            const toDate = params?.to ? new Date(`${params.to}T23:59:59.999`) : null;

            const filtered = (all || []).filter((n) => {
              if (!n?.fecha) return true;
              const d = new Date(n.fecha);
              if (Number.isNaN(d.getTime())) return true;
              if (fromDate && d < fromDate) return false;
              if (toDate && d > toDate) return false;
              return true;
            });

            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const safePage = Math.min(page, totalPages);
            const start = (safePage - 1) * pageSize;
            const items = filtered.slice(start, start + pageSize);

            return {
              page: safePage,
              pageSize,
              total,
              totalPages,
              items
            } as NotificacionesPagedResponse;
          })
        );
      })
    );
  }

  marcarLeida(id: number | string): Observable<any> {
    // Estrategia tolerante: probar PUT minúsculas → PATCH → PUT mayúscula → POST
    return this.api.put(`/notificaciones/${id}/leer`, {}).pipe(
      catchError(err1 => this.api.patch(`/notificaciones/${id}/leer`, {}).pipe(
        catchError(err2 => this.api.put(`/Notificaciones/${id}/leer`, {}).pipe(
          catchError(err3 => this.api.post(`/notificaciones/${id}/leer`, {}).pipe(
            catchError(() => throwError(() => err1))
          ))
        ))
      ))
    );
  }

  eliminar(id: number | string): Observable<any> {
    return this.api.delete(`/notificaciones/${id}`);
  }

  crear(payload: { titulo?: string; mensaje: string; destinoRol?: 'oferente' | 'admin'; modulo?: 'alojamiento' | 'gastronomia'; referenciaId?: number | string }): Observable<any> {
    const body = {
      titulo: payload.titulo || 'Nueva reserva',
      mensaje: payload.mensaje,
      destinoRol: payload.destinoRol || 'oferente',
      modulo: payload.modulo || 'alojamiento',
      referenciaId: payload.referenciaId
    };
    // Header para que el interceptor omita el log de error (petición opcional)
    const silentHeaders = new HttpHeaders({ 'X-Skip-Error-Log': 'true' });
    return this.api.post('/notificaciones', body, silentHeaders).pipe(
      // Si falla, probar variante PascalCase y si también falla, devolver null sin propagar error
      catchError(() => this.api.post('/Notificaciones', {
        Titulo: body.titulo,
        Mensaje: body.mensaje,
        DestinoRol: body.destinoRol,
        Modulo: body.modulo,
        ReferenciaId: body.referenciaId
      }, silentHeaders).pipe(
        catchError(err2 => {
          console.warn('Creación de notificación no soportada, se ignora:', err2?.status);
          return of(null);
        })
      ))
    );
  }
}
