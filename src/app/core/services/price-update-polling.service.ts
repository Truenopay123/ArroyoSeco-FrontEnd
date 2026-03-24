import { Injectable, inject } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PriceUpdate {
  alojamientoId: number;
  precioNuevo: number;
}

@Injectable({
  providedIn: 'root'
})
export class PriceUpdateService {
  private api = inject(ApiService);
  private priceUpdates$ = new BehaviorSubject<PriceUpdate | null>(null);
  private pollingSubscription?: Subscription;
  private trackingAlojamientos = new Map<number, number>(); // alojamientoId -> ultimoPrecio

  /**
   * Iniciar polling para detectar cambios de precio
   * Se ejecuta cada 5 segundos y compara precios
   */
  startPolling(): void {
    if (this.pollingSubscription) {
      return; // Ya está polling
    }

    console.log('[PricePolling] Iniciando polling de precios');
    
    // Realizar check cada 5 segundos
    this.pollingSubscription = interval(5000).subscribe(() => {
      this.checkPrices();
    });
  }

  /**
   * Agregar un alojamiento a monitorear
   */
  trackAlojamiento(alojamientoId: number, precioPorNoche: number): void {
    this.trackingAlojamientos.set(alojamientoId, precioPorNoche);
    console.log(`[PricePolling] Rastreando alojamiento ${alojamientoId} a $${precioPorNoche}`);
  }

  /**
   * Dejar de monitorear un alojamiento
   */
  untrackAlojamiento(alojamientoId: number): void {
    this.trackingAlojamientos.delete(alojamientoId);
  }

  /**
   * Verificar precios actuales vs almacenados
   */
  private checkPrices(): void {
    if (this.trackingAlojamientos.size === 0) {
      return; // No hay nada que monitorear
    }

    // Obtener todos los alojamientos
    this.api.get<any[]>('/alojamientos').subscribe({
      next: (alojamientos: any[]) => {
        alojamientos.forEach(a => {
          const idTracking = this.trackingAlojamientos.get(a.id);
          if (idTracking !== undefined && idTracking !== a.precioPorNoche) {
            // Precio cambió!
            console.log(
              `[PricePolling] Precio cambió en alojamiento ${a.id}: $${idTracking} → $${a.precioPorNoche}`
            );
            
            // Actualizar el precio almacenado
            this.trackingAlojamientos.set(a.id, a.precioPorNoche);
            
            // Emitir actualización
            this.priceUpdates$.next({
              alojamientoId: a.id,
              precioNuevo: a.precioPorNoche
            });
          }
        });
      },
      error: (err) => {
        console.log('[PricePolling] Error verificando precios:', err);
      }
    });
  }

  /**
   * Obtener observable de actualizaciones de precio
   */
  onPriceUpdate(): Observable<PriceUpdate | null> {
    return this.priceUpdates$.asObservable();
  }

  /**
   * Detener polling
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
      console.log('[PricePolling] Polling detenido');
    }
  }
}
