import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';

export interface DatosBancariosGastronomiaResponse {
  banco: string;
  numeroCuenta: string;
  clabe: string;
  titularCuenta: string;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class PagosGastronomiaService {
  private readonly api = inject(ApiService);

  getDatosBancarios(reservaId: number): Observable<DatosBancariosGastronomiaResponse> {
    return this.api.get<DatosBancariosGastronomiaResponse>(`/pagos-gastronomia/datos-bancarios/${reservaId}`);
  }

  enviarComprobante(reservaId: number, monto: number, archivo: File): Observable<any> {
    const fd = new FormData();
    fd.append('reservaId', reservaId.toString());
    fd.append('monto', monto.toString());
    fd.append('comprobante', archivo);
    return this.api.postFormData<any>('/pagos-gastronomia/enviar-comprobante', fd);
  }

  getPagosReserva(reservaId: number): Observable<any[]> {
    return this.api.get<any[]>(`/pagos-gastronomia/reserva/${reservaId}`);
  }

  getComprobanteReserva(reservaId: number): Observable<any> {
    return this.api.get<any>(`/pagos-gastronomia/reserva/${reservaId}/comprobante`);
  }

  confirmarPago(pagoId: number): Observable<any> {
    return this.api.post<any>(`/pagos-gastronomia/confirmar/${pagoId}`, {});
  }

  rechazarPago(pagoId: number): Observable<any> {
    return this.api.post<any>(`/pagos-gastronomia/rechazar/${pagoId}`, {});
  }

  getPendientesConfirmacion(): Observable<any[]> {
    return this.api.get<any[]>('/pagos-gastronomia/pendientes-confirmacion');
  }
}
