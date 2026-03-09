import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';

export interface PreferenciaPagoResponse {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private readonly api = inject(ApiService);

  /** Crea una preferencia de pago en Mercado Pago y devuelve el initPoint */
  crearPreferencia(reservaId: number): Observable<PreferenciaPagoResponse> {
    return this.api.post<PreferenciaPagoResponse>('/pagos/crear-preferencia', { reservaId });
  }

  /** Obtiene el resultado del pago para una reserva */
  getResultado(reservaId: number, estado: string): Observable<any> {
    return this.api.get<any>(`/pagos/resultado?reservaId=${reservaId}&estado=${encodeURIComponent(estado)}`);
  }

  /** Obtiene los pagos de una reserva */
  getPagosReserva(reservaId: number): Observable<any[]> {
    return this.api.get<any[]>(`/pagos/reserva/${reservaId}`);
  }

  getComprobanteReserva(reservaId: number): Observable<any> {
    return this.api.get<any>(`/pagos/reserva/${reservaId}/comprobante`);
  }
}
