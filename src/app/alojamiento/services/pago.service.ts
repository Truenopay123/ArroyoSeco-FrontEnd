import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';

export interface DatosBancariosResponse {
  banco: string;
  numeroCuenta: string;
  clabe: string;
  titularCuenta: string;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private readonly api = inject(ApiService);

  getDatosBancarios(reservaId: number): Observable<DatosBancariosResponse> {
    return this.api.get<DatosBancariosResponse>(`/pagos/datos-bancarios/${reservaId}`);
  }

  enviarComprobante(reservaId: number, monto: number, archivo: File): Observable<any> {
    const fd = new FormData();
    fd.append('reservaId', reservaId.toString());
    fd.append('monto', monto.toString());
    fd.append('comprobante', archivo);
    return this.api.postFormData<any>('/pagos/enviar-comprobante', fd);
  }

  getPagosReserva(reservaId: number): Observable<any[]> {
    return this.api.get<any[]>(`/pagos/reserva/${reservaId}`);
  }

  getComprobanteReserva(reservaId: number): Observable<any> {
    return this.api.get<any>(`/pagos/reserva/${reservaId}/comprobante`);
  }

  confirmarPago(pagoId: number): Observable<any> {
    return this.api.post<any>(`/pagos/confirmar/${pagoId}`, {});
  }

  rechazarPago(pagoId: number): Observable<any> {
    return this.api.post<any>(`/pagos/rechazar/${pagoId}`, {});
  }

  getPendientesConfirmacion(): Observable<any[]> {
    return this.api.get<any[]>('/pagos/pendientes-confirmacion');
  }
}
