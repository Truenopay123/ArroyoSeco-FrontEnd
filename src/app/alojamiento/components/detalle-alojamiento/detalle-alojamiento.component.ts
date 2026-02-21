import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlojamientoService, AlojamientoDto } from '../../services/alojamiento.service';
import { ReservasService } from '../../services/reservas.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { first, switchMap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private alojamientosService = inject(AlojamientoService);
  private reservasService = inject(ReservasService);
  private notiService = inject(NotificacionesService);

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
  comprobanteFile: File | null = null;
  creando = false;
  isPublic = false;

  // Lightbox
  lightboxOpen = false;
  lightboxIndex = 0;

  // Amenities list
  readonly amenities = [
    { icon: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z', label: 'WiFi' },
    { icon: 'M7 11v2h10v-2H7zm5-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z', label: 'Estacionamiento' },
    { icon: 'M21 18H3v2h18v-2zM17.12 5.56A3.07 3.07 0 0 0 12 2.68 3.07 3.07 0 0 0 6.88 5.56L3 16h18l-3.88-10.44z', label: 'Alberca' },
    { icon: 'M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z', label: 'Aire acondicionado' },
    { icon: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z', label: 'Cocina equipada' },
    { icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z', label: 'TV' },
  ];

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
    this.comprobanteFile = null;
  }

  // Exponer estado de autenticación al template
  get autenticado(): boolean {
    return this.auth.isAuthenticated();
  }

  onComprobanteChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.comprobanteFile = input.files?.[0] || null;
    if (this.comprobanteFile) {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowed.includes(this.comprobanteFile.type)) {
        this.toast.error('Formato no permitido. Use PDF/JPG/PNG.');
        this.comprobanteFile = null;
      } else if (this.comprobanteFile.size > 18 * 1024 * 1024) { // < 20MB backend limit
        this.toast.error('El archivo supera el límite (18MB).');
        this.comprobanteFile = null;
      }
    }
  }

  confirmarReservaYComprobante() {
    if (!this.booking.entrada || !this.booking.salida || !this.comprobanteFile) {
      this.toast.error('Fechas y comprobante requeridos');
      return;
    }
    this.creando = true;
    const payload = {
      alojamientoId: this.alojamientoId,
      fechaEntrada: this.formatDateLocal(this.booking.entrada),
      fechaSalida: this.formatDateLocal(this.booking.salida),
      huespedes: this.booking.huespedes
    };
    // Crear primero y subir comprobante; la notificación al oferente es opcional (si falla no afecta el éxito de la reserva)
    this.reservasService.crear(payload).pipe(
      switchMap((r: any) => this.reservasService.subirComprobante(Number(r.id || r.Id), this.comprobanteFile!).pipe(map(() => r))),
      first()
    ).subscribe({
      next: (r: any) => {
        // Disparar notificación de manera independiente y tolerante
        this.notiService.crear({
          titulo: 'Reserva enviada',
          mensaje: `Nueva reserva en alojamiento #${this.alojamientoId}. Pago en revisión.`,
          destinoRol: 'oferente',
          modulo: 'alojamiento',
          referenciaId: Number(r.id || r.Id)
        }).pipe(
          catchError(err => {
            console.warn('Notificación opcional falló (se ignora):', err);
            return of(null);
          })
        ).subscribe();

        console.log('Reserva creada exitosamente');
        this.toast.success('Reserva enviada. Pago en revisión.');
        this.creando = false;
        this.cerrarModalPago();
        this.booking = { entrada: null, salida: null, huespedes: 1 };
        this.cargarCalendario();
      },
      error: (err) => {
        console.error('Error al crear reserva:', err);
        const msg = typeof err?.error === 'string' ? err.error : (err?.error?.message || err?.message || 'Error desconocido');
        this.toast.error(`No se pudo procesar la reserva: ${msg}`);
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
