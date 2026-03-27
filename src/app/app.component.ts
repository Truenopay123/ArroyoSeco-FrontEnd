import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from './shared/services/toast.service';
import { OfflineQueueService } from './core/services/offline-queue.service';

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
  readonly offlineQueue = inject(OfflineQueueService);

  isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  canInstall = false;
  showInstallBanner = false;
  updateAvailable = false;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private updateCheckIntervalId: number | null = null;
  private installShowTimeoutId: number | null = null;
  private installHideTimeoutId: number | null = null;
  private readonly INSTALL_DISMISS_KEY = 'pwa-install-dismissed';
  private readonly INSTALL_SHOW_DELAY = 30_000;  // 30s tras carga
  private readonly INSTALL_VISIBLE_TIME = 15_000; // visible 15s

  ngOnInit(): void {
    this.isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    this.initializeServiceWorkerUpdates();
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
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isOffline = false;
    this.toast.success('Conexión restablecida.');
    // Sincronizar cola de peticiones pendientes
    if (this.offlineQueue.pendingCount > 0) {
      void this.offlineQueue.flush();
    }
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOffline = true;
    this.toast.warning('Estás sin conexión. Algunas funciones seguirán disponibles.');
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
}
