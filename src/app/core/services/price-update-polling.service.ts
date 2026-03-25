import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { ApiService } from './api.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PriceUpdate {
  alojamientoId: number;
  precioNuevo: number;
}

@Injectable({
  providedIn: 'root'
})
export class PriceUpdateService {
  private static readonly BASE_INTERVAL_MS = 30000;
  private static readonly MAX_INTERVAL_MS = 5 * 60 * 1000;
  private static readonly PRICE_UPDATED_EVENT = 'PriceUpdated';

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly priceUpdates$ = new BehaviorSubject<PriceUpdate | null>(null);
  private readonly trackingAlojamientos = new Map<number, number>(); // alojamientoId -> ultimoPrecio
  private pollingTimeoutId?: ReturnType<typeof globalThis.setTimeout>;
  private isPollingActive = false;
  private isRequestInFlight = false;
  private failureCount = 0;
  private hasLoggedPollingFailure = false;
  private realtimeConnection: HubConnection | null = null;
  private isRealtimeConnected = false;
  private hasLoggedRealtimeFailure = false;
  private isStartingRealtime = false;

  /**
   * Iniciar polling para detectar cambios de precio.
   */
  startPolling(): void {
    if (this.isPollingActive) {
      return;
    }

    this.isPollingActive = true;
    void this.ensureRealtimeConnection();
    this.scheduleNextCheck(PriceUpdateService.BASE_INTERVAL_MS);
  }

  /**
   * Agregar un alojamiento a monitorear
   */
  trackAlojamiento(alojamientoId: number, precioPorNoche: number): void {
    this.trackingAlojamientos.set(alojamientoId, precioPorNoche);

    if (this.isRealtimeConnected) {
      void this.joinAlojamientoGroup(alojamientoId);
    }

    if (this.isPollingActive && this.pollingTimeoutId === undefined) {
      this.scheduleNextCheck(1000);
    }
  }

  /**
   * Dejar de monitorear un alojamiento
   */
  untrackAlojamiento(alojamientoId: number): void {
    this.trackingAlojamientos.delete(alojamientoId);

    if (this.isRealtimeConnected) {
      void this.leaveAlojamientoGroup(alojamientoId);
    }
  }

  /**
   * Verificar precios actuales vs almacenados
   */
  private checkPrices(): void {
    if (!this.isPollingActive) {
      return;
    }

    if (this.trackingAlojamientos.size === 0) {
      this.scheduleNextCheck(PriceUpdateService.BASE_INTERVAL_MS);
      return;
    }

    if (this.isRealtimeConnected) {
      this.scheduleNextCheck(PriceUpdateService.MAX_INTERVAL_MS);
      return;
    }

    if (this.isRequestInFlight) {
      this.scheduleNextCheck(this.getNextInterval());
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.scheduleNextCheck(PriceUpdateService.MAX_INTERVAL_MS);
      return;
    }

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.scheduleNextCheck(PriceUpdateService.BASE_INTERVAL_MS * 2);
      return;
    }

    this.isRequestInFlight = true;

    this.api.get<any[]>('/alojamientos').subscribe({
      next: (alojamientos: any[]) => {
        this.isRequestInFlight = false;
        this.failureCount = 0;
        if (this.hasLoggedPollingFailure) {
          console.info('[PricePolling] Conexion recuperada, se reanuda la verificacion de precios.');
          this.hasLoggedPollingFailure = false;
        }

        alojamientos.forEach(a => {
          const idTracking = this.trackingAlojamientos.get(a.id);
          if (idTracking !== undefined && idTracking !== a.precioPorNoche) {
            this.trackingAlojamientos.set(a.id, a.precioPorNoche);

            this.priceUpdates$.next({
              alojamientoId: a.id,
              precioNuevo: a.precioPorNoche
            });
          }
        });

        this.scheduleNextCheck(this.getNextInterval());
      },
      error: (err) => {
        this.isRequestInFlight = false;
        this.failureCount += 1;

        if (!this.hasLoggedPollingFailure) {
          console.warn('[PricePolling] Se pausa la verificacion automatica de precios porque el backend no responde.', err?.status);
          this.hasLoggedPollingFailure = true;
        }

        this.scheduleNextCheck(this.getNextInterval());
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
    this.isPollingActive = false;
    this.isRequestInFlight = false;
    this.failureCount = 0;
    this.hasLoggedPollingFailure = false;
    this.isRealtimeConnected = false;
    this.hasLoggedRealtimeFailure = false;

    if (this.pollingTimeoutId !== undefined) {
      globalThis.clearTimeout(this.pollingTimeoutId);
      this.pollingTimeoutId = undefined;
    }

    if (this.realtimeConnection) {
      this.realtimeConnection.stop().catch(() => undefined);
      this.realtimeConnection = null;
    }
  }

  private scheduleNextCheck(delayMs: number): void {
    if (!this.isPollingActive) {
      return;
    }

    if (this.pollingTimeoutId !== undefined) {
      globalThis.clearTimeout(this.pollingTimeoutId);
    }

    this.pollingTimeoutId = globalThis.setTimeout(() => {
      this.pollingTimeoutId = undefined;
      this.checkPrices();
    }, delayMs);
  }

  private getNextInterval(): number {
    if (this.failureCount <= 0) {
      return PriceUpdateService.BASE_INTERVAL_MS;
    }

    const backoffMultiplier = Math.min(2 ** (this.failureCount - 1), 10);
    return Math.min(
      PriceUpdateService.BASE_INTERVAL_MS * backoffMultiplier,
      PriceUpdateService.MAX_INTERVAL_MS
    );
  }

  private async ensureRealtimeConnection(): Promise<void> {
    if (!this.isPollingActive || this.isStartingRealtime) {
      return;
    }

    if (this.realtimeConnection?.state === HubConnectionState.Connected) {
      return;
    }

    this.isStartingRealtime = true;

    try {
      if (!this.realtimeConnection) {
        this.realtimeConnection = this.createRealtimeConnection();
      }

      if (this.realtimeConnection.state === HubConnectionState.Disconnected) {
        await this.realtimeConnection.start();
      }

      this.isRealtimeConnected = this.realtimeConnection.state === HubConnectionState.Connected;
      if (this.isRealtimeConnected) {
        await this.joinTrackedAlojamientos();
        this.hasLoggedRealtimeFailure = false;
      }
    } catch {
      this.isRealtimeConnected = false;
      if (!this.hasLoggedRealtimeFailure) {
        console.warn('[PricePolling] No se pudo establecer conexion en tiempo real. Se usara verificacion gradual como respaldo.');
        this.hasLoggedRealtimeFailure = true;
      }
    } finally {
      this.isStartingRealtime = false;
    }
  }

  private createRealtimeConnection(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl(`${this.api.publicBaseUrl}/hubs/prices`, {
        accessTokenFactory: async () => this.auth.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Error)
      .build();

    connection.on(PriceUpdateService.PRICE_UPDATED_EVENT, (update: PriceUpdate) => {
      this.applyRealtimePriceUpdate(update);
    });

    connection.onreconnecting(() => {
      this.isRealtimeConnected = false;
      this.scheduleNextCheck(PriceUpdateService.BASE_INTERVAL_MS);
    });

    connection.onreconnected(async () => {
      this.isRealtimeConnected = true;
      await this.joinTrackedAlojamientos();
    });

    connection.onclose(() => {
      this.isRealtimeConnected = false;
      if (this.isPollingActive) {
        this.scheduleNextCheck(this.getNextInterval());
        void this.ensureRealtimeConnection();
      }
    });

    return connection;
  }

  private applyRealtimePriceUpdate(update: PriceUpdate | null | undefined): void {
    if (!update) {
      return;
    }

    const precioActual = this.trackingAlojamientos.get(update.alojamientoId);
    if (precioActual === undefined || precioActual === update.precioNuevo) {
      return;
    }

    this.trackingAlojamientos.set(update.alojamientoId, update.precioNuevo);
    this.priceUpdates$.next(update);
  }

  private async joinTrackedAlojamientos(): Promise<void> {
    if (!this.realtimeConnection || this.realtimeConnection.state !== HubConnectionState.Connected) {
      return;
    }

    for (const alojamientoId of this.trackingAlojamientos.keys()) {
      await this.joinAlojamientoGroup(alojamientoId);
    }
  }

  private async joinAlojamientoGroup(alojamientoId: number): Promise<void> {
    if (!this.realtimeConnection || this.realtimeConnection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.realtimeConnection.invoke('JoinAlojamientoGroup', alojamientoId);
    } catch {
      this.isRealtimeConnected = false;
    }
  }

  private async leaveAlojamientoGroup(alojamientoId: number): Promise<void> {
    if (!this.realtimeConnection || this.realtimeConnection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.realtimeConnection.invoke('LeaveAlojamientoGroup', alojamientoId);
    } catch {
      this.isRealtimeConnected = false;
    }
  }
}
