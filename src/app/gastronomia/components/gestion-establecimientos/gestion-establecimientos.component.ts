import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GastronomiaService, EstablecimientoDto } from '../../services/gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-gestion-establecimientos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gestion-establecimientos.component.html',
  styleUrl: './gestion-establecimientos.component.scss'
})
export class GestionEstablecimientosComponent implements OnInit {
  establecimientos: EstablecimientoDto[] = [];
  loading = false;
  isOffline = !navigator.onLine;

  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private gastronomiaService: GastronomiaService,
    private toast: ToastService,
    private confirmModal: ConfirmModalService
  ) {}

  ngOnInit(): void {
    this.loadEstablecimientos();

    // Recargar al sincronizar acciones pendientes (offline → online)
    this.offlineQueue.synced$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadEstablecimientos());

    window.addEventListener('online', () => {
      this.isOffline = false;
      this.loadEstablecimientos();
    });
    window.addEventListener('offline', () => {
      this.isOffline = true;
    });
  }

  private loadEstablecimientos() {
    this.loading = true;
    this.gastronomiaService.listMine().pipe(first()).subscribe({
      next: (data) => {
        this.establecimientos = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar establecimientos:', err);
        if (!navigator.onLine) {
          // Offline: los datos pueden venir del caché del SW
          this.establecimientos = [];
        } else {
          this.toast.error('Error al cargar establecimientos. Por favor verifica que el backend esté funcionando.');
          this.establecimientos = [];
        }
        this.loading = false;
      }
    });
  }

  async eliminar(id?: number) {
    if (!id) return;
    const confirmed = await this.confirmModal.confirm({
      title: 'Eliminar establecimiento',
      message: '¿Estás seguro de eliminar este establecimiento?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDangerous: true
    });
    if (!confirmed) return;

    this.gastronomiaService.delete(id).pipe(first()).subscribe({
      next: () => {
        this.toast.success('Establecimiento eliminado');
        this.loadEstablecimientos();
      },
      error: () => {
        this.toast.error('Error al eliminar');
      }
    });
  }
}
