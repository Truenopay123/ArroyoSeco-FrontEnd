import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificacionesService, NotificacionDto } from '../../services/notificaciones.service';
import { first } from 'rxjs/operators';

interface Notificacion {
  id: string;
  nombre: string;
  telefono: string;
  negocio: string;
  estatus: 'Abierta' | 'Atendida';
  leida: boolean;
}

@Component({
  selector: 'app-admin-notificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notificaciones.component.html',
  styleUrl: './admin-notificaciones.component.scss'
})
export class AdminNotificacionesComponent implements OnInit {
  searchTerm = '';
  notificaciones: Notificacion[] = [];
  loading = false;
  error: string | null = null;

  private readonly MOCK_NOTIFICACIONES: Notificacion[] = [
    { id: 'mock-n1', nombre: 'Nueva reserva - Cabaña del Bosque', telefono: '442-123-4567', negocio: 'Cabaña del Bosque', estatus: 'Abierta', leida: false },
    { id: 'mock-n2', nombre: 'Pago confirmado - Hotel Río Claro', telefono: '442-234-5678', negocio: 'Hotel Río Claro', estatus: 'Atendida', leida: true },
    { id: 'mock-n3', nombre: 'Cancelación de reserva - Posada Sol', telefono: '442-345-6789', negocio: 'Posada Sol', estatus: 'Abierta', leida: false },
    { id: 'mock-n4', nombre: 'Solicitud de oferente aprobada', telefono: '442-456-7890', negocio: 'Restaurante La Plaza', estatus: 'Atendida', leida: true },
    { id: 'mock-n5', nombre: 'Nuevo oferente registrado', telefono: '442-567-8901', negocio: 'Casa Rural Los Pinos', estatus: 'Abierta', leida: false },
    { id: 'mock-n6', nombre: 'Comprobante de pago pendiente', telefono: '442-678-9012', negocio: 'Hacienda San Miguel', estatus: 'Abierta', leida: false },
    { id: 'mock-n7', nombre: 'Reseña recibida ★★★★★', telefono: '442-789-0123', negocio: 'Cabaña del Bosque', estatus: 'Atendida', leida: true },
  ];

  constructor(private notiService: NotificacionesService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar() {
    this.loading = true;
    this.notiService.list(false).pipe(first()).subscribe({
      next: (data: NotificacionDto[]) => {
        const mapped: Notificacion[] = (data || [])
          .map(d => {
            const rawId = (d as any)?.id ?? (d as any)?.ID ?? (d as any)?.notificacionId ?? '';
            if (!rawId) return null;
            return {
              id: String(rawId),
              nombre: d.titulo || 'Solicitud',
              telefono: '',
              negocio: '',
              estatus: (d.leida ? 'Atendida' : 'Abierta') as 'Atendida' | 'Abierta',
              leida: !!d.leida
            } satisfies Notificacion;
          })
          .filter((n): n is Notificacion => !!n);
        this.notificaciones = mapped;
        if (this.notificaciones.length === 0) {
          this.notificaciones = this.MOCK_NOTIFICACIONES;
        }
        this.loading = false;
      },
      error: () => {
        this.notificaciones = this.MOCK_NOTIFICACIONES;
        this.loading = false;
      }
    });
  }

  get filteredNotificaciones(): Notificacion[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.notificaciones;
    return this.notificaciones.filter(item => [item.nombre, item.telefono, item.negocio].some(v => v.toLowerCase().includes(term)));
  }

  marcarLeida(n: Notificacion) {
    if (!n.id) return;
    this.notiService.marcarLeida(n.id).pipe(first()).subscribe({
      next: () => {
        n.leida = true;
        n.estatus = 'Atendida';
      },
      error: () => this.error = 'No se pudo marcar como leída'
    });
  }
}
