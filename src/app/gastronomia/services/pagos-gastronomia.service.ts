import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';

export interface PreferenciaPagoGastronomiaResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
}

@Injectable({ providedIn: 'root' })
export class PagosGastronomiaService {
  private readonly api = inject(ApiService);

  crearPreferencia(reservaId: number): Observable<PreferenciaPagoGastronomiaResponse> {
    return this.api.post<PreferenciaPagoGastronomiaResponse>('/pagos-gastronomia/crear-preferencia', { reservaId });
  }

  getResultado(reservaId: number, estado: string): Observable<any> {
    return this.api.get<any>(`/pagos-gastronomia/resultado?reservaId=${reservaId}&estado=${encodeURIComponent(estado)}`);
  }

  getPagosReserva(reservaId: number): Observable<any[]> {
    return this.api.get<any[]>(`/pagos-gastronomia/reserva/${reservaId}`);
  }

  getComprobanteReserva(reservaId: number): Observable<any> {
    return this.api.get<any>(`/pagos-gastronomia/reserva/${reservaId}/comprobante`);
  }
}
