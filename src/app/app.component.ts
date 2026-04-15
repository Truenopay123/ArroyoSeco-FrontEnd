import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from './shared/services/toast.service';
import { OfflineQueueService } from './core/services/offline-queue.service';
import { environment } from '../environments/environment';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastContainerComponent, ConfirmModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly toast = inject(ToastService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  readonly offlineQueue = inject(OfflineQueueService);

  isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  canInstall = false;
  showInstallBanner = false;
  updateAvailable = false;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private updateCheckIntervalId: number | null = null;
  private installShowTimeoutId: number | null = null;
  private installHideTimeoutId: number | null = null;
  private heartbeatId: number | null = null;
  private readonly INSTALL_DISMISS_KEY = 'pwa-install-dismissed';
  private readonly INSTALL_SHOW_DELAY = 30_000;  // 30s tras carga
  private readonly INSTALL_VISIBLE_TIME = 15_000; // visible 15s
  private readonly HEARTBEAT_ONLINE_MS = 15_000;   // cada 15s cuando online
  private readonly HEARTBEAT_OFFLINE_MS = 5_000;   // cada 5s cuando offline (detectar recuperación rápido)
  private readonly HEARTBEAT_TIMEOUT_MS = 4_000;   // timeout de cada ping

  ngOnInit(): void {
    this.isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    this.initializeServiceWorkerUpdates();
    this.startHeartbeat();
  }

  ngOnDestroy(): void {
    if (this.updateCheckIntervalId !== null) {
      window.clearInterval(this.updateCheckIntervalId);
    }
    if (this.installShowTimeoutId !== null) {
      window.clearTimeout(this.installShowTimeoutId);
    }
    if (this.installHideTimeoutId !== null) {
      window.clearTimeout(this.installHideTimeoutId);
    }
    if (this.heartbeatId !== null) {
      window.clearTimeout(this.heartbeatId);
    }
  }

  @HostListener('window:online')
  onOnline(): void {
    // El evento browser se disparó: verificar con ping real antes de declarar online
    void this.checkRealConnectivity();
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.setOfflineState(true);
    // Reiniciar heartbeat con cadencia más rápida
    if (this.heartbeatId !== null) {
      window.clearTimeout(this.heartbeatId);
    }
    this.zone.runOutsideAngular(() => this.scheduleNextHeartbeat());
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.deferredPrompt = event as BeforeInstallPromptEvent;
    this.canInstall = true;
    this.scheduleInstallBanner();
  }

  @HostListener('window:appinstalled')
  onAppInstalled(): void {
    this.canInstall = false;
    this.showInstallBanner = false;
    this.deferredPrompt = null;
    this.toast.success('App instalada correctamente.');
  }

  async actualizarApp(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      window.location.reload();
      return;
    }

    this.toast.info('Actualizando aplicacion...', 2500);

    try {
      await this.swUpdate.activateUpdate();
    } finally {
      window.location.reload();
    }
  }

  async instalarApp(): Promise<void> {
    if (!this.deferredPrompt) return;

    await this.deferredPrompt.prompt();
    const choice = await this.deferredPrompt.userChoice;
    this.canInstall = false;
    this.showInstallBanner = false;
    this.deferredPrompt = null;

    if (choice.outcome === 'accepted') {
      this.toast.info('Instalación iniciada.');
    } else {
      this.markInstallDismissed();
    }
  }

  dismissInstallBanner(): void {
    this.showInstallBanner = false;
    this.markInstallDismissed();
  }

  private scheduleInstallBanner(): void {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(this.INSTALL_DISMISS_KEY)) {
      return;
    }

    this.installShowTimeoutId = window.setTimeout(() => {
      if (this.canInstall) {
        this.showInstallBanner = true;

        this.installHideTimeoutId = window.setTimeout(() => {
          this.showInstallBanner = false;
        }, this.INSTALL_VISIBLE_TIME);
      }
    }, this.INSTALL_SHOW_DELAY);
  }

  private markInstallDismissed(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.INSTALL_DISMISS_KEY, '1');
    }
  }

  private initializeServiceWorkerUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          this.updateAvailable = true;
          this.toast.info('Hay una nueva version disponible para instalar.');
        }
      });

    void this.swUpdate.checkForUpdate().catch(() => undefined);

    this.updateCheckIntervalId = window.setInterval(() => {
      void this.swUpdate.checkForUpdate().catch(() => undefined);
    }, 6 * 60 * 60 * 1000);
  }

  // ── Heartbeat de conectividad real ──────────────────────────────────

  /**
   * Hace un HEAD al API periódicamente para detectar si realmente hay internet.
   * navigator.onLine solo indica si hay interfaz de red activa (puede dar true
   * con adaptadores virtuales aunque no haya internet), así que este ping
   * complementa los eventos online/offline del browser.
   */
  private startHeartbeat(): void {
    // Ejecutar fuera de la zona de Angular para no disparar change detection en cada tick
    this.zone.runOutsideAngular(() => {
      this.scheduleNextHeartbeat();
    });
  }

  private scheduleNextHeartbeat(): void {
    const interval = this.isOffline ? this.HEARTBEAT_OFFLINE_MS : this.HEARTBEAT_ONLINE_MS;
    this.heartbeatId = window.setTimeout(() => {
      void this.checkRealConnectivity();
    }, interval);
  }

  private async checkRealConnectivity(): Promise<void> {
    // Atajo: si navigator.onLine es false, ya sabemos que no hay red
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setOfflineState(true);
      this.scheduleNextHeartbeat();
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), this.HEARTBEAT_TIMEOUT_MS);

    try {
      // HEAD request ligero al API (no transfiere body)
      const pingUrl = environment.apiUrl.replace(/\/api\/?$/, '') + '/health';
      await fetch(pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store'
      });
      // Llegó respuesta (cualquier status) → hay internet
      this.setOfflineState(false);
    } catch {
      // Timeout, DNS fail, CORS error cuando no hay red, abort → sin internet
      this.setOfflineState(true);
    } finally {
      window.clearTimeout(timeoutId);
      this.scheduleNextHeartbeat();
    }
  }

  private setOfflineState(offline: boolean): void {
    if (offline === this.isOffline) return; // sin cambio

    this.zone.run(() => {
      if (offline && !this.isOffline) {
        this.isOffline = true;
        this.toast.warning('Estás sin conexión. Algunas funciones seguirán disponibles.');
      } else if (!offline && this.isOffline) {
        this.isOffline = false;
        this.toast.success('Conexión restablecida.');
        if (this.offlineQueue.pendingCount > 0) {
          void this.offlineQueue.flush();
        }
      }
    });
  }
}
