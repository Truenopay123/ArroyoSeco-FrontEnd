import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FavoritesService, FavoriteAlojamiento } from '../../../shared/services/favorites.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AlojamientoService, AlojamientoDto } from '../../services/alojamiento.service';
import { AuthService } from '../../../core/services/auth.service';
import { PriceUpdateService } from '../../../core/services/price-update.service';
import { first, catchError, map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { forkJoin, of, Subscription } from 'rxjs';

interface Alojamiento {
  id: number;
  nombre: string;
  ubicacion: string;
  precioNoche: number;
  rating: number;
  totalResenas: number;
  imagen: string;
}

@Component({
  selector: 'app-lista-alojamientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-alojamientos.component.html',
  styleUrl: './lista-alojamientos.component.scss'
})
export class ListaAlojamientosComponent implements OnInit, OnDestroy {
  search = '';
  sortMode: 'precio' | 'rating' | 'nombre' = 'precio';
  alojamientos: Alojamiento[] = [];
  loading = false;
  error: string | null = null;
  isPublic = false;
  private priceUpdateSubscription?: Subscription;

  constructor(private readonly favs: FavoritesService,
              private readonly toast: ToastService,
              private readonly alojamientosService: AlojamientoService,
              private readonly api: ApiService,
              private readonly auth: AuthService,
              private readonly priceUpdateService: PriceUpdateService,
              private readonly router: Router,
              private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    // Detectar si estamos en ruta pública
    this.isPublic = this.router.url.includes('/publica/');
    this.fetchAlojamientos();
    
    // Inicializar SignalR para recibir actualizaciones de precio
    this.setupPriceUpdates();
  }

  ngOnDestroy(): void {
    // Desuscribirse de actualizaciones de precio
    this.priceUpdateSubscription?.unsubscribe();
    // Detener polling
    this.priceUpdateService.stopPolling();
  }

  private setupPriceUpdates(): void {
    // Iniciar polling de precios
    this.priceUpdateService.startPolling();

    // Escuchar actualizaciones de precio
    this.priceUpdateSubscription = this.priceUpdateService.onPriceUpdate()
      .subscribe(update => {
        if (!update) return;

        // Actualizar el precio en la lista sin refrescar
        const alojamiento = this.alojamientos.find(a => a.id === update.alojamientoId);
        if (alojamiento) {
          console.log(`Precio actualizado: ${alojamiento.nombre} de $${alojamiento.precioNoche} a $${update.precioNuevo}`);
          alojamiento.precioNoche = update.precioNuevo;
          // Toast en la esquina
          this.toast.show(`Precio actualizado: ${alojamiento.nombre}`, 'info');
        }
      });
  }

  private fetchAlojamientos() {
    this.loading = true;
    this.error = null;
    this.alojamientosService.listAll().pipe(first()).subscribe({
      next: (data: AlojamientoDto[]) => {
        const base = (data || []).map(d => ({
          id: d.id!,
            nombre: d.nombre,
            ubicacion: d.ubicacion,
            precioNoche: d.precioPorNoche,
            rating: 0,
            totalResenas: 0,
            imagen: d.fotoPrincipal || (d.fotosUrls && d.fotosUrls.length > 0 ? d.fotosUrls[0] : '') || 'assets/images/PuenteRio.jpeg'
        }));

        if (!base.length) {
          this.alojamientos = [];
          this.loading = false;
          return;
        }

        forkJoin(
          base.map(a =>
            this.api.get<any>(`/resenas/alojamiento/${a.id}`).pipe(
              map(res => ({ id: a.id, promedio: Number(res?.promedio || 0), total: Number(res?.total || 0) })),
              catchError(() => of({ id: a.id, promedio: 0, total: 0 }))
            )
          )
        ).pipe(first()).subscribe({
          next: ratings => {
            const byId = new Map<number, { promedio: number; total: number }>();
            ratings.forEach(r => byId.set(r.id, r));
            this.alojamientos = base.map(a => ({
              ...a,
              rating: byId.get(a.id)?.promedio || 0,
              totalResenas: byId.get(a.id)?.total || 0,
            }));
            // Unirse a los grupos de SignalR para cada alojamiento
            this.alojamientos.forEach(a => {
              this.priceUpdateService.trackAlojamiento(a.id, a.precioNoche);
            });
            this.loading = false;
          },
          error: () => {
            this.alojamientos = base;
            // Unirse a los grupos de SignalR para cada alojamiento
            this.alojamientos.forEach(a => {
              this.priceUpdateService.trackAlojamiento(a.id, a.precioNoche);
            });
            this.loading = false;
          }
        });
      },
      error: () => {
        this.alojamientos = [];
        this.error = 'No se pudieron cargar los alojamientos';
        this.loading = false;
      }
    });
  }

  get filtered(): Alojamiento[] {
    if (this.loading || this.error) return this.alojamientos; // evitar operaciones si hay estado especial
    let result = this.alojamientos.filter(a =>
      a.nombre.toLowerCase().includes(this.search.toLowerCase()) ||
      a.ubicacion.toLowerCase().includes(this.search.toLowerCase())
    );
    switch (this.sortMode) {
      case 'precio':
        result = [...result].sort((a, b) => a.precioNoche - b.precioNoche);
        break;
      case 'rating':
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      case 'nombre':
        result = [...result].sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
    }
    return result;
  }

  isFavorite(id: number): boolean {
    return this.favs.isFavorite(id);
  }

  toggleFavorite(a: Alojamiento, ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    const wasFav = this.isFavorite(a.id);
    this.favs.toggle(a as FavoriteAlojamiento);
    this.toast.info(wasFav ? 'Eliminado de favoritos' : 'Añadido a favoritos');
  }

  navigateToDetail(id: number) {
    if (this.isPublic && !this.auth.isAuthenticated()) {
      this.toast.error('Debes iniciar sesión para ver detalles');
      this.router.navigate(['/login']);
      return;
    }
    
    const route = this.isPublic ? '/publica/alojamientos' : '/cliente/alojamientos';
    this.router.navigate([route, id]);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.dataset['fallback']) {
      img.dataset['fallback'] = '1';
      img.src = 'assets/images/PuenteRio.jpeg';
    }
  }

  retry() {
    this.fetchAlojamientos();
  }
}
