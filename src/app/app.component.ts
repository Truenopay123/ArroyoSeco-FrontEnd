import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ConfirmModalComponent } from './shared/components/confirm-modal/confirm-modal.component';
import { ToastService } from './shared/services/toast.service';

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

  isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  canInstall = false;
  updateAvailable = false;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private updateCheckIntervalId: number | null = null;

  ngOnInit(): void {
    this.isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    this.initializeServiceWorkerUpdates();
  }

  ngOnDestroy(): void {
    if (this.updateCheckIntervalId !== null) {
      window.clearInterval(this.updateCheckIntervalId);
    }
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isOffline = false;
    this.toast.success('Conexión restablecida.');
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
  }

  @HostListener('window:appinstalled')
  onAppInstalled(): void {
    this.canInstall = false;
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
    this.deferredPrompt = null;

    if (choice.outcome === 'accepted') {
      this.toast.info('Instalación iniciada.');
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
