import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GastronomiaService, EstablecimientoDto, MenuDto } from '../../services/gastronomia.service';
import { ReservasGastronomiaService } from '../../services/reservas-gastronomia.service';
import { ResenasGastronomiaService } from '../../services/resenas-gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-detalle-gastronomia',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './detalle-gastronomia.component.html',
  styleUrl: './detalle-gastronomia.component.scss'
})
export class DetalleGastronomiaComponent implements OnInit {
  establecimiento: EstablecimientoDto | null = null;
  menus: MenuDto[] = [];
  loading = false;
  error: string | null = null;
  isPublic = false;
  isOffline = !navigator.onLine;

  // Galería de fotos
  gallery: string[] = [];
  lightboxOpen = false;
  lightboxIndex = 0;

  // Reseñas
  ratingPromedio = 0;
  totalResenas = 0;
  resenasPublicas: any[] = [];

  // Formulario de reserva
  showReservaForm = false;
  fecha = '';
  numeroPersonas = 2;
  mesaId: number | null = null;
  submitting = false;
  erroresReserva: { [campo: string]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gastronomiaService: GastronomiaService,
    private reservasService: ReservasGastronomiaService,
    private resenasService: ResenasGastronomiaService,
    private toast: ToastService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.isPublic = this.router.url.includes('/publica/');
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadEstablecimiento(id);
      this.loadMenus(id);
    }

    window.addEventListener('online', () => {
      this.isOffline = false;
      if (id) {
        this.loadEstablecimiento(id);
        this.loadMenus(id);
      }
    });
    window.addEventListener('offline', () => {
      this.isOffline = true;
    });
  }

  private loadEstablecimiento(id: number) {
    this.loading = true;
    this.gastronomiaService.getById(id).pipe(first()).subscribe({
      next: (data) => {
        this.establecimiento = data;
        // Build gallery
        const fotos = (data as any).fotosUrls || [];
        this.gallery = [data.fotoPrincipal, ...fotos]
          .filter(Boolean)
          .filter((url: string, idx: number, arr: string[]) => arr.indexOf(url) === idx);
        this.loading = false;
        this.cargarResenas(id);
      },
      error: () => {
        this.error = !navigator.onLine
          ? 'Sin conexión: no se pudo cargar este restaurante desde el caché.'
          : 'Error al cargar el restaurante';
        this.loading = false;
      }
    });
  }

  private loadMenus(id: number) {
    this.gastronomiaService.getMenus(id).pipe(first()).subscribe({
      next: (data) => {
        this.menus = data || [];
      },
      error: () => {
        console.error('Error al cargar menús');
      }
    });
  }

  toggleReservaForm() {
    if (this.isPublic) {
      const id = this.establecimiento?.id;
      const returnUrl = id ? `/cliente/gastronomia/${id}` : '/cliente/gastronomia';
      this.toast.error('Debes iniciar sesión para hacer una reserva');
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.toast.error('Debes iniciar sesión para hacer una reserva');
      this.router.navigate(['/login']);
      return;
    }
    this.showReservaForm = !this.showReservaForm;
  }

  crearReserva() {
    if (this.isPublic) {
      const id = this.establecimiento?.id;
      const returnUrl = id ? `/cliente/gastronomia/${id}` : '/cliente/gastronomia';
      this.toast.error('Debes iniciar sesión para hacer una reserva');
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.toast.error('Debes iniciar sesión para hacer una reserva');
      this.router.navigate(['/login']);
      return;
    }
    if (!this.establecimiento?.id) return;

    if (!this.fecha || !this.numeroPersonas) {
      this.toast.error('Completa todos los campos');
      return;
    }

    this.erroresReserva = {};
    let valido = true;

    // Validar fecha
    const fechaReserva = new Date(this.fecha);
    const ahora = new Date();
    if (isNaN(fechaReserva.getTime())) {
      this.erroresReserva['fecha'] = 'Selecciona una fecha y hora válida';
      valido = false;
    } else if (fechaReserva <= ahora) {
      this.erroresReserva['fecha'] = 'La fecha y hora debe ser posterior a la actual';
      valido = false;
    } else {
      const maxFecha = new Date();
      maxFecha.setMonth(maxFecha.getMonth() + 3);
      if (fechaReserva > maxFecha) {
        this.erroresReserva['fecha'] = 'Solo puedes reservar con hasta 3 meses de anticipación';
        valido = false;
      }
    }

    // Validar número de personas
    if (!this.numeroPersonas || this.numeroPersonas < 1) {
      this.erroresReserva['personas'] = 'Debe haber al menos 1 comensal';
      valido = false;
    } else if (!Number.isInteger(this.numeroPersonas)) {
      this.erroresReserva['personas'] = 'El número de comensales debe ser entero';
      valido = false;
    } else if (this.numeroPersonas > 20) {
      this.erroresReserva['personas'] = 'El máximo de comensales por reserva es 20';
      valido = false;
    }

    // Validar mesa seleccionada si aplica
    if (this.mesaId && this.establecimiento?.mesas) {
      const mesa = this.establecimiento.mesas.find(m => m.id === this.mesaId);
      if (mesa && !mesa.disponible) {
        this.erroresReserva['mesa'] = 'La mesa seleccionada no está disponible';
        valido = false;
      }
      if (mesa && this.numeroPersonas > mesa.capacidad) {
        this.erroresReserva['mesa'] = `La mesa seleccionada tiene capacidad para ${mesa.capacidad} personas`;
        valido = false;
      }
    }

    if (!valido) {
      const primerError = Object.values(this.erroresReserva)[0];
      this.toast.error(primerError);
      return;
    }

    this.submitting = true;
    const payload = {
      establecimientoId: this.establecimiento.id,
      fecha: new Date(this.fecha).toISOString(),
      numeroPersonas: this.numeroPersonas,
      mesaId: this.mesaId || null
    };

    console.log('Enviando reserva con payload:', payload);
    this.reservasService.crear(payload)
      .pipe(first())
      .subscribe({
        next: (result) => {
          console.log('Reserva de gastronomía creada exitosamente:', result);
          this.toast.success('¡Reserva creada exitosamente!');
          this.showReservaForm = false;
          this.resetForm();
          this.submitting = false;
          // Redirigir a listado de reservas de gastronomía (ruta existente)
          this.router.navigate(['/cliente/gastronomia/reservas']);
        },
        error: (err) => {
          console.error('Error al crear reserva de gastronomía:', err);
          this.toast.error(err?.error?.message || 'Error al crear la reserva');
          this.submitting = false;
        }
      });
  }

  private resetForm() {
    this.fecha = '';
    this.numeroPersonas = 2;
    this.mesaId = null;
  }

  get galleryImages(): string[] {
    return this.gallery.length > 0 ? this.gallery : [];
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
    this.lightboxIndex = this.lightboxIndex > 0 ? this.lightboxIndex - 1 : this.gallery.length - 1;
  }

  nextImage(ev: Event) {
    ev.stopPropagation();
    this.lightboxIndex = this.lightboxIndex < this.gallery.length - 1 ? this.lightboxIndex + 1 : 0;
  }

  private cargarResenas(establecimientoId: number) {
    this.resenasService.getByEstablecimiento(establecimientoId).pipe(first()).subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : (resp?.resenas || []);
        this.resenasPublicas = list.map((r: any) => ({
          id: r.id,
          calificacion: Number(r.calificacion) || 0,
          comentario: String(r.comentario || ''),
          fechaCreacion: r.fechaCreacion
        }));
        this.totalResenas = this.resenasPublicas.length;
        if (this.totalResenas > 0) {
          const sum = this.resenasPublicas.reduce((a: number, b: any) => a + b.calificacion, 0);
          this.ratingPromedio = sum / this.totalResenas;
        }
      },
      error: () => {}
    });
  }

  estrellasArr(n: number): number[] {
    return Array(Math.max(0, Math.round(n))).fill(0);
  }

  abrirComoLlegar() {
    if (!this.establecimiento?.latitud || !this.establecimiento?.longitud) {
      this.toast.error('No hay coordenadas disponibles para este restaurante');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${this.establecimiento.latitud},${this.establecimiento.longitud}`;
    window.open(url, '_blank');
  }

  // Exponer autenticación al template
  get autenticado(): boolean {
    return this.auth.isAuthenticated();
  }
}
