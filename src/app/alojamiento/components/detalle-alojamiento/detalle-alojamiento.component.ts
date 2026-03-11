import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlojamientoService, AlojamientoDto } from '../../services/alojamiento.service';
import { ReservasService } from '../../services/reservas.service';
import { PagoService } from '../../services/pago.service';
import { AuthService } from '../../../core/services/auth.service';
import { first, switchMap } from 'rxjs/operators';
import { MatDatepickerModule, MatDateRangePicker } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../core/services/api.service';

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
  private readonly api = inject(ApiService);

  alojamientoId!: number;
  alojamiento?: AlojamientoDto;
  gallery: string[] = [];
  booking = { entrada: null as Date | null, salida: null as Date | null, huespedes: 1 };
  loading = false;
  error: string | null = null;
  reservedDateSet = new Set<string>();
  ratingPromedio = 0;
  totalResenas = 0;
  resenasPublicas: Array<{ id: number; calificacion: number; comentario: string; fechaCreacion: string }> = [];
  @ViewChild('picker') picker!: MatDateRangePicker<Date>;

  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return day >= today && !this.reservedDateSet.has(this.key(day));
  };

  dateClass = (d: Date, view: string): string => {
    if (view !== 'month') return '';
    return this.reservedDateSet.has(this.key(d)) ? 'reserved-date' : '';
  };

  showPagoModal = false;
  creando = false;
  isPublic = false;
  aceptaCondiciones = false;

  // Lightbox
  lightboxOpen = false;
  lightboxIndex = 0;
  readonly placeholderImage = 'https://placehold.co/1200x800?text=Sin+foto';

  get amenities(): Array<{ icon: string; label: string }> {
    const fromDb = this.alojamiento?.amenidades || [];
    if (!fromDb.length) return [];

    return fromDb.map(label => ({
      label,
      icon: this.getAmenityIcon(label)
    }));
  }

  get condicionesUso(): string[] {
    return this.alojamiento?.condicionesUso || [];
  }

  get anfitrionNombre(): string {
    return this.alojamiento?.anfitrionNombre || 'Anfitrión';
  }

  private getAmenityIcon(label: string): string {
    const key = label.toLowerCase().trim();
    if (key.includes('wifi')) return 'M12 18c.69 0 1.25.56 1.25 1.25S12.69 20.5 12 20.5s-1.25-.56-1.25-1.25S11.31 18 12 18zm3.53-2.47a5 5 0 00-7.06 0l-.88-.88a6.25 6.25 0 018.82 0l-.88.88zm2.12-2.12a8 8 0 00-11.3 0l-.88-.88a9.25 9.25 0 0113.06 0l-.88.88zm2.12-2.12a11 11 0 00-15.54 0l-.88-.88a12.25 12.25 0 0117.3 0l-.88.88z';
    if (key.includes('aire')) return 'M3 11h18v2H3v-2zm2-4h14v2H5V7zm0 8h14v2H5v-2z';
    if (key.includes('tv')) return 'M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1h-6l2 2h-4l2-2H4a1 1 0 01-1-1V6a1 1 0 011-1z';
    if (key.includes('asador')) return 'M5 5h14v2H5V5zm2 4h10l-1 8H8L7 9zm3 10h4v2h-4v-2z';
    if (key.includes('pet')) return 'M12 3l-2.5 2H7a2 2 0 00-2 2v4a7 7 0 0014 0V7a2 2 0 00-2-2h-2.5L12 3zm-3 6a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2zm-3 6a2.5 2.5 0 01-2.45-2h4.9A2.5 2.5 0 0112 15z';
    if (key.includes('estacionamiento')) return 'M7 4h6a4 4 0 010 8H9v8H7V4zm2 2v4h4a2 2 0 000-4H9z';
    return 'M12 2a10 10 0 100 20 10 10 0 000-20z';
  }

  // Gallery fallback images
  get galleryImages(): string[] {
    if (!this.gallery.length) return [this.placeholderImage];
    if (this.gallery.length >= 5) return this.gallery;
    const padded = [...this.gallery];
    let idx = 0;
    while (padded.length < 5) {
      padded.push(this.gallery[idx % this.gallery.length]);
      idx++;
    }
    return padded;
  }

  get nights(): number {
    if (!this.booking.entrada || !this.booking.salida) return 0;
    const ms = this.booking.salida.getTime() - this.booking.entrada.getTime();
    return ms > 0 ? Math.ceil(ms / 86400000) : 0;
  }

  get serviceFee(): number {
    return 0;
  }

  get grandTotal(): number {
    return this.total + this.serviceFee;
  }

  get ratingLabel(): string {
    return this.totalResenas > 0 ? this.ratingPromedio.toFixed(1) : 'Nuevo';
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
      this.cargarResenas();
    }
  }

  private cargarResenas() {
    this.api.get<any>(`/resenas/alojamiento/${this.alojamientoId}`).pipe(first()).subscribe({
      next: (res) => {
        this.ratingPromedio = Number(res?.promedio || 0);
        this.totalResenas = Number(res?.total || 0);
        this.resenasPublicas = (res?.resenas || []).map((r: any) => ({
          id: Number(r.id || 0),
          calificacion: Number(r.calificacion || 0),
          comentario: String(r.comentario || ''),
          fechaCreacion: String(r.fechaCreacion || ''),
        }));
      },
      error: () => {
        this.ratingPromedio = 0;
        this.totalResenas = 0;
        this.resenasPublicas = [];
      }
    });
  }

  private cargar() {
    this.loading = true;
    this.alojamientosService.getById(this.alojamientoId).pipe(first()).subscribe({
      next: (a) => {
        this.alojamiento = a;
        const fotos = a.fotosUrls || [];
        this.gallery = [a.fotoPrincipal, ...fotos]
          .filter(Boolean)
          .filter((url, idx, arr) => arr.indexOf(url) === idx) as string[];
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
          const start = this.parseBackendDate(r.inicio);
          const end = this.parseBackendDate(r.fin);
          if (!start || !end) continue;
          for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            days.push(this.key(d));
          }
        }
        this.reservedDateSet = new Set(days);
        console.log('[Calendario] Fechas ocupadas cargadas:', days.length, days);

        // Reasignar las funciones para que Angular detecte el cambio y
        // el datepicker vuelva a renderizar las celdas del calendario.
        const prevFilter = this.dateFilter;
        this.dateFilter = (d: Date | null): boolean => prevFilter(d);
        const prevClass = this.dateClass;
        this.dateClass = (d: Date, view: string): string => prevClass(d, view);
      },
      error: (err) => console.error('[Calendario] Error cargando fechas ocupadas:', err)
    });
  }

  // Verifica que el rango seleccionado no incluya días ocupados
  rangoDisponible(): boolean {
    const inicio = this.booking.entrada;
    const fin = this.booking.salida;
    if (!inicio || !fin) return false;
    if (fin <= inicio) return false;
    const d = new Date(inicio);
    while (d < fin) {
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
    this.aceptaCondiciones = false;
    this.showPagoModal = true;
  }

  onEntradaChange(ev: any) {
    const d: Date | null = ev?.value ?? null;
    if (!this.dateFilter(d)) {
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
    if (!this.dateFilter(d)) {
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
    this.aceptaCondiciones = false;
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
    if (this.condicionesUso.length > 0 && !this.aceptaCondiciones) {
      this.toast.error('Debes aceptar las condiciones de uso para continuar');
      return;
    }

    const maxHuespedes = this.alojamiento?.maxHuespedes || 1;
    const numeroHuespedes = Math.min(maxHuespedes, Math.max(1, Number(this.booking.huespedes || 1)));
    this.booking.huespedes = numeroHuespedes;

    this.creando = true;
    const payload = {
      alojamientoId: this.alojamientoId,
      fechaEntrada: this.formatDateLocal(this.booking.entrada),
      fechaSalida: this.formatDateLocal(this.booking.salida),
      numeroHuespedes,
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

  private parseBackendDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    // Use yyyy-MM-dd part only to avoid timezone shifts from ISO timestamps.
    const raw = String(value).trim();
    const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!m) {
      const fallback = new Date(raw);
      return Number.isNaN(fallback.getTime()) ? null : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
    }

    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d);
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
