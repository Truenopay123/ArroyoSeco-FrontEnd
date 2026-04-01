import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { AlojamientoService, AlojamientoDto } from '../../services/alojamiento.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { first } from 'rxjs/operators';

interface Hospedaje {
  id: string;
  nombre: string;
  ubicacion: string;
  huespedes: number;
  habitaciones: number;
  banos: number;
  precio: number;
  estado: 'Reservado' | 'Pendiente de pago' | 'Confirmado';
  imagen: string;
}

@Component({
  selector: 'app-gestion-hospedajes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './gestion-hospedajes.component.html',
  styleUrl: './gestion-hospedajes.component.scss'
})
export class GestionHospedajesComponent implements OnInit {
  private readonly toastService = inject(ToastService);
  private readonly alojamientosService = inject(AlojamientoService);
  private readonly authService = inject(AuthService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly destroyRef = inject(DestroyRef);

  searchTerm = '';
  nombreOferente = 'oferente';

  hospedajes: Hospedaje[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.cargarNombreOferente();
    this.cargarHospedajes();

    // Recargar la lista cuando se sincronicen acciones pendientes (offline → online)
    this.offlineQueue.synced$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarHospedajes());
  }

  private cargarNombreOferente() {
    this.authService.me().pipe(first()).subscribe({
      next: (user: any) => {
        this.nombreOferente = this.extraerNombreVisible(user);
      },
      error: () => {
        this.nombreOferente = 'oferente';
      }
    });
  }

  private extraerNombreVisible(user: any): string {
    const candidate = [
      user?.nombre,
      user?.name,
      user?.nombreCompleto,
      user?.fullName,
      user?.usuario?.nombre,
      user?.usuario?.nombreCompleto,
      user?.displayName
    ].find((v) => typeof v === 'string' && v.trim().length > 0);

    if (candidate) {
      return String(candidate).trim();
    }

    const email = [user?.email, user?.correo, user?.mail]
      .find((v) => typeof v === 'string' && v.trim().length > 0);

    if (email) {
      return String(email).split('@')[0].trim();
    }

    return 'oferente';
  }

  private cargarHospedajes() {
    this.loading = true;
    this.alojamientosService.listMine().pipe(first()).subscribe({
      next: (data: AlojamientoDto[]) => {
        this.hospedajes = (data || []).map(d => ({
          id: String(d.id),
          nombre: d.nombre,
          ubicacion: d.ubicacion,
          huespedes: d.maxHuespedes,
          habitaciones: d.habitaciones,
          banos: d.banos,
          precio: d.precioPorNoche,
          estado: 'Confirmado', // Suponemos estado generico, backend no provee
          imagen: d.fotoPrincipal || (d.fotosUrls && d.fotosUrls.length > 0 ? d.fotosUrls[0] : '') || 'assets/images/PuenteRio.jpeg'
        }));
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar tus hospedajes';
        this.loading = false;
      }
    });
  }

  get filteredHospedajes(): Hospedaje[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.hospedajes;
    }

    return this.hospedajes.filter((h) =>
      [h.nombre, h.ubicacion, h.estado]
        .some((value) => value.toLowerCase().includes(term))
    );
  }

  async eliminar(hospedaje: Hospedaje) {
    const ok = await this.confirmModal.confirm({ title: 'Eliminar hospedaje', message: `¿Estás seguro de eliminar "${hospedaje.nombre}"?`, confirmText: 'Eliminar', cancelText: 'Cancelar', isDangerous: true });
    if (ok) {
      // Backend delete
      this.alojamientosService.delete(Number(hospedaje.id)).pipe(first()).subscribe({
        next: () => {
          this.hospedajes = this.hospedajes.filter(h => h.id !== hospedaje.id);
          this.toastService.success(`Hospedaje "${hospedaje.nombre}" eliminado`);
        },
        error: () => this.toastService.error('No se pudo eliminar hospedaje')
      });
    }
  }
}
