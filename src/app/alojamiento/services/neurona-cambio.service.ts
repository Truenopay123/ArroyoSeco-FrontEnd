import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface CalcularCambioRequest {
  precioPesosMxn: number;
  pagoDolares: number;
}

export interface CalcularCambioResponse {
  pagoConvertidoMxn: number;
  valorRealApiMxn: number;
  cambioMxn: number;
  tipoCambio: number;
}

@Injectable({
  providedIn: 'root'
})
export class NeuronaCambioService {
  private readonly api = inject(ApiService);

  calcularCambio(payload: CalcularCambioRequest): Observable<CalcularCambioResponse> {
    return this.api.post<CalcularCambioResponse>('/neurona/calcular-cambio', payload);
  }
}