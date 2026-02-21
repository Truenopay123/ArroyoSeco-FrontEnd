import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FavoritesService, FavoriteAlojamiento } from '../../../shared/services/favorites.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AlojamientoService, AlojamientoDto } from '../../services/alojamiento.service';
import { AuthService } from '../../../core/services/auth.service';
import { first } from 'rxjs/operators';

interface Alojamiento {
  id: number;
  nombre: string;
  ubicacion: string;
  precioNoche: number;
  rating: number;
  imagen: string;
}

@Component({
  selector: 'app-lista-alojamientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-alojamientos.component.html',
  styleUrl: './lista-alojamientos.component.scss'
})
export class ListaAlojamientosComponent implements OnInit {
  search = '';
  sortMode: 'precio' | 'rating' | 'nombre' = 'precio';
  alojamientos: Alojamiento[] = [];
  loading = false;
  error: string | null = null;
  isPublic = false;

  constructor(private favs: FavoritesService,
              private toast: ToastService,
              private alojamientosService: AlojamientoService,
              private auth: AuthService,
              private router: Router,
              private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Detectar si estamos en ruta pública
    this.isPublic = this.router.url.includes('/publica/');
    this.fetchAlojamientos();
  }

  private fetchAlojamientos() {
    this.loading = true;
    this.error = null;
    this.alojamientosService.listAll().pipe(first()).subscribe({
      next: (data: AlojamientoDto[]) => {
        this.alojamientos = (data || []).map(d => ({
          id: d.id!,
            nombre: d.nombre,
            ubicacion: d.ubicacion,
            precioNoche: d.precioPorNoche,
            rating: 0, // Backend aún no provee rating
            imagen: d.fotoPrincipal || 'assets/images/hero-oferentes.svg'
        }));
        // Si no hay datos del backend, usar datos estáticos de demostración
        if (this.alojamientos.length === 0) {
          this.alojamientos = this.getStaticAlojamientos();
        }
        this.loading = false;
      },
      error: () => {
        // Fallback a datos estáticos cuando el backend no está disponible
        this.alojamientos = this.getStaticAlojamientos();
        this.error = null;
        this.loading = false;
      }
    });
  }

  private getStaticAlojamientos(): Alojamiento[] {
    return [
      {
        id: 1,
        nombre: 'Cabaña El Encino',
        ubicacion: 'Arroyo Seco Centro',
        precioNoche: 1200,
        rating: 4.8,
        imagen: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&h=400&fit=crop'
      },
      {
        id: 2,
        nombre: 'Hotel Río Escondido',
        ubicacion: 'Camino al Río Escanela',
        precioNoche: 1850,
        rating: 4.9,
        imagen: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop'
      },
      {
        id: 3,
        nombre: 'Posada Sierra Gorda',
        ubicacion: 'Sierra Gorda, Arroyo Seco',
        precioNoche: 950,
        rating: 4.6,
        imagen: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop'
      },
      {
        id: 4,
        nombre: 'Glamping Las Cascadas',
        ubicacion: 'Zona de Cascadas',
        precioNoche: 2200,
        rating: 5.0,
        imagen: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&h=400&fit=crop'
      },
      {
        id: 5,
        nombre: 'Casa Rural El Mirador',
        ubicacion: 'Mirador de Arroyo Seco',
        precioNoche: 1500,
        rating: 4.7,
        imagen: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop'
      },
      {
        id: 6,
        nombre: 'Ecohotel Agua Azul',
        ubicacion: 'Río Escanela',
        precioNoche: 1750,
        rating: 4.5,
        imagen: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop'
      },
      {
        id: 7,
        nombre: 'Cabaña Los Pinos',
        ubicacion: 'Bosque de Arroyo Seco',
        precioNoche: 1100,
        rating: 4.4,
        imagen: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=600&h=400&fit=crop'
      },
      {
        id: 8,
        nombre: 'Hotel Boutique Querétaro',
        ubicacion: 'Centro Histórico',
        precioNoche: 2500,
        rating: 4.9,
        imagen: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop'
      }
    ];
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
    this.toast.info(!wasFav ? 'Añadido a favoritos' : 'Eliminado de favoritos');
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

  retry() {
    this.fetchAlojamientos();
  }
}
