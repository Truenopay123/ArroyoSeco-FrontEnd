import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlojamientoService, AlojamientoDto } from '../../services/alojamiento.service';
import { ReservasService } from '../../services/reservas.service';
import { PagoService } from '../../services/pago.service';
import { AuthService } from '../../../core/services/auth.service';
import { first, switchMap } from 'rxjs/operators';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-detalle-alojamiento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule],
  templateUrl: './detalle-alojamiento.component.html',
  styleUrl: './detalle-alojamiento.component.scss'
})
export class DetalleAlojamientoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly alojamientosService = inject(AlojamientoService);
  private readonly reservasService = inject(ReservasService);
  private readonly pagoService = inject(PagoService);

  alojamientoId!: number;
  alojamiento?: AlojamientoDto;
  gallery: string[] = [];
  booking = { entrada: null as Date | null, salida: null as Date | null, huespedes: 1 };
  loading = false;
  error: string | null = null;
  reservedDateSet = new Set<string>();
  private isDisponible(d: Date | null): boolean {
    return !!d && !this.reservedDateSet.has(this.key(d));
  }
  showPagoModal = false;
  creando = false;
  isPublic = false;

  // Lightbox
  lightboxOpen = false;
  lightboxIndex = 0;

  get amenities(): Array<{ icon: string; label: string }> {
    const fromDb = this.alojamiento?.amenidades || [];
    if (!fromDb.length) return [];

    return fromDb.map(label => ({
      label,
      icon: this.getAmenityIcon()
    }));
  }

  private getAmenityIcon(): string {
    return 'M12 2a10 10 0 100 20 10 10 0 000-20z';
  }

  // Gallery fallback images
  readonly defaultGalleryImages = [
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop'
  ];

  get galleryImages(): string[] {
    if (this.gallery.length >= 5) return this.gallery;
    if (this.gallery.length > 0) {
      const padded = [...this.gallery];
      while (padded.length < 5) {
        padded.push(this.defaultGalleryImages[padded.length % this.defaultGalleryImages.length]);
      }
      return padded;
    }
    return this.defaultGalleryImages;
  }

  get nights(): number {
    if (!this.booking.entrada || !this.booking.salida) return 0;
    const ms = this.booking.salida.getTime() - this.booking.entrada.getTime();
    return ms > 0 ? Math.ceil(ms / 86400000) : 0;
  }

  get serviceFee(): number {
    return Math.round(this.total * 0.08);
  }

  get grandTotal(): number {
    return this.total + this.serviceFee;
  }

  openLightbox(index: number) {
    this.lightboxIndex = index;
    this.lightboxOpen = true;
  }

  closeLightbox() {
    this.lightboxOpen = false;
  }

  prevImage(ev: Event) {
    ev.stopPropagation();
    this.lightboxIndex = this.lightboxIndex > 0 ? this.lightboxIndex - 1 : this.galleryImages.length - 1;
  }

  nextImage(ev: Event) {
    ev.stopPropagation();
    this.lightboxIndex = (this.lightboxIndex + 1) % this.galleryImages.length;
  }

  shareProperty() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: this.alojamiento?.nombre || 'Alojamiento', url });
    } else {
      navigator.clipboard.writeText(url);
      this.toast.success('Enlace copiado al portapapeles');
    }
  }

  ngOnInit(): void {
    this.isPublic = this.router.url.includes('/publica/');
    const idParam = this.route.snapshot.paramMap.get('id');
    this.alojamientoId = idParam ? parseInt(idParam, 10) : 0;
    if (this.alojamientoId) {
      this.cargar();
      this.cargarCalendario();
    }
  }

  private cargar() {
    this.loading = true;
    this.alojamientosService.getById(this.alojamientoId).pipe(first()).subscribe({
      next: (a) => {
        this.alojamiento = a;
        const fotos = a.fotosUrls || [];
        this.gallery = [a.fotoPrincipal, ...fotos].filter(Boolean) as string[];
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el alojamiento';
        this.loading = false;
      }
    });
  }

  private cargarCalendario() {
    this.reservasService.getCalendario(this.alojamientoId).pipe(first()).subscribe({
      next: rangos => {
        const days: string[] = [];
        for (const r of rangos) {
          const start = new Date(r.inicio);
          const end = new Date(r.fin);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(this.key(d));
          }
        }
        this.reservedDateSet = new Set(days);
      },
      error: () => {}
    });
  }

  dateClass = (d: Date) => this.reservedDateSet.has(this.key(d)) ? 'reserved-date' : '';

  // Verifica que el rango seleccionado no incluya días ocupados
  rangoDisponible(): boolean {
    const inicio = this.booking.entrada;
    const fin = this.booking.salida;
    if (!inicio || !fin) return false;
    if (fin < inicio) return false;
    const d = new Date(inicio);
    while (d <= fin) {
      if (this.reservedDateSet.has(this.key(d))) return false;
      d.setDate(d.getDate() + 1);
    }
    return true;
  }

  get total(): number {
    if (!this.booking.entrada || !this.booking.salida || !this.alojamiento) return 0;
    const ms = this.booking.salida.getTime() - this.booking.entrada.getTime();
    const nights = ms > 0 ? Math.ceil(ms / 86400000) : 0;
    return nights * this.alojamiento.precioPorNoche;
  }

  abrirModalPago(form: NgForm) {
    if (this.isPublic) {
      const returnUrl = `/cliente/alojamientos/${this.alojamientoId}`;
      this.toast.error('Debes iniciar sesión para hacer una reserva');
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.toast.error('Debes iniciar sesión para hacer una reserva');
      this.router.navigate(['/login']);
      return;
    }
    if (form.invalid || !this.total) return;
    if (!this.rangoDisponible()) {
      this.toast.error('El rango seleccionado incluye fechas ocupadas');
      return;
    }
    this.showPagoModal = true;
  }

  onEntradaChange(ev: any) {
    const d: Date | null = ev?.value ?? null;
    if (!this.isDisponible(d)) {
      this.booking.entrada = null;
      this.toast.error('Fecha de entrada ocupada');
    } else {
      this.booking.entrada = d;
      // Ajustar salida si quedó antes de entrada
      if (this.booking.entrada && this.booking.salida && this.booking.salida < this.booking.entrada) {
        this.booking.salida = null;
      }
    }
  }

  onSalidaChange(ev: any) {
    const d: Date | null = ev?.value ?? null;
    if (!this.isDisponible(d)) {
      this.booking.salida = null;
      this.toast.error('Fecha de salida ocupada');
    } else {
      this.booking.salida = d;
      if (this.booking.entrada && this.booking.salida && this.booking.salida < this.booking.entrada) {
        this.toast.error('La salida no puede ser antes de la entrada');
        this.booking.salida = null;
      }
    }
  }

  cerrarModalPago() {
    if (this.creando) return;
    this.showPagoModal = false;
  }

  // Exponer estado de autenticación al template
  get autenticado(): boolean {
    return this.auth.isAuthenticated();
  }

  confirmarReservaYPagar() {
    if (!this.booking.entrada || !this.booking.salida) {
      this.toast.error('Fechas requeridas');
      return;
    }

    this.creando = true;
    const payload = {
      alojamientoId: this.alojamientoId,
      fechaEntrada: this.formatDateLocal(this.booking.entrada),
      fechaSalida: this.formatDateLocal(this.booking.salida),
      huespedes: this.booking.huespedes,
      aceptaPoliticaDatos: true
    };

    this.reservasService.crear(payload).pipe(
      switchMap((r: any) => {
        const reservaId = Number(r.id || r.Id || 0);
        if (!reservaId) {
          throw new Error('No se pudo crear la reserva.');
        }
        return this.pagoService.crearPreferencia(reservaId);
      }),
      first()
    ).subscribe({
      next: (pref: any) => {
        const initPoint = pref?.initPoint || pref?.sandboxInitPoint;
        if (!initPoint) {
          this.toast.error('No se pudo obtener el enlace de pago.');
          this.creando = false;
          return;
        }
        window.location.href = initPoint;
        this.creando = false;
      },
      error: (err) => {
        console.error('Error al crear reserva:', err);
        const msg = typeof err?.error === 'string' ? err.error : (err?.error?.message || err?.message || 'Error desconocido');
        this.toast.error(`No se pudo iniciar el pago: ${msg}`);
        this.creando = false;
      }
    });
  }

  private key(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private formatDateLocal(d: Date): string {
    // Enviar como YYYY-MM-DDT00:00:00 para mayor compatibilidad con DateTime en backend
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
  }

  abrirComoLlegar() {
    if (!this.alojamiento?.latitud || !this.alojamiento?.longitud) {
      this.toast.error('No hay coordenadas disponibles para este alojamiento');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${this.alojamiento.latitud},${this.alojamiento.longitud}`;
    window.open(url, '_blank');
  }
}
