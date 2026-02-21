import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { GastronomiaService, EstablecimientoDto } from '../../services/gastronomia.service';
import { AuthService } from '../../../core/services/auth.service';
import { first } from 'rxjs/operators';

interface Establecimiento {
  id: number;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  imagen: string;
}

@Component({
  selector: 'app-lista-gastronomia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-gastronomia.component.html',
  styleUrl: './lista-gastronomia.component.scss'
})
export class ListaGastronomiaComponent implements OnInit {
  search = '';
  sortMode: 'nombre' | 'ubicacion' = 'nombre';
  establecimientos: Establecimiento[] = [];
  loading = false;
  error: string | null = null;
  isPublic = false;

  constructor(
    private toast: ToastService,
    private gastronomiaService: GastronomiaService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Detectar si estamos en ruta pública
    this.isPublic = this.router.url.includes('/publica/');
    this.fetchEstablecimientos();
  }

  private fetchEstablecimientos() {
    this.loading = true;
    this.error = null;
    this.gastronomiaService.listAll().pipe(first()).subscribe({
      next: (data: EstablecimientoDto[]) => {
        this.establecimientos = (data || []).map(d => ({
          id: d.id!,
          nombre: d.nombre,
          ubicacion: d.ubicacion,
          descripcion: d.descripcion,
          imagen: d.fotoPrincipal || 'assets/images/hero-oferentes.svg'
        }));
        // Si no hay datos del backend, usar datos estáticos de demostración
        if (this.establecimientos.length === 0) {
          this.establecimientos = this.getStaticEstablecimientos();
        }
        this.loading = false;
      },
      error: () => {
        // Fallback a datos estáticos cuando el backend no está disponible
        this.establecimientos = this.getStaticEstablecimientos();
        this.error = null;
        this.loading = false;
      }
    });
  }

  private getStaticEstablecimientos(): Establecimiento[] {
    return [
      {
        id: 1,
        nombre: 'Restaurante El Mirador',
        ubicacion: 'Centro de Arroyo Seco',
        descripcion: 'Cocina tradicional queretana con vista panorámica al valle. Especialidad en carnes asadas y enchiladas serranas.',
        imagen: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'
      },
      {
        id: 2,
        nombre: 'Fonda Doña María',
        ubicacion: 'Plaza Principal, Arroyo Seco',
        descripcion: 'Comida casera de la Sierra Gorda. Famosa por sus gorditas, tamales y atole de nuez.',
        imagen: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop'
      },
      {
        id: 3,
        nombre: 'La Trucha Feliz',
        ubicacion: 'Camino al Río Escanela',
        descripcion: 'Especialidad en trucha fresca del río, preparada al estilo serrano. Ambiente rústico junto al agua.',
        imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop'
      },
      {
        id: 4,
        nombre: 'Café Sierra Gorda',
        ubicacion: 'Calle Hidalgo 12, Arroyo Seco',
        descripcion: 'Café de altura cultivado localmente. Postres artesanales, pan de elote y dulces regionales.',
        imagen: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop'
      },
      {
        id: 5,
        nombre: 'Asador Los Nogales',
        ubicacion: 'Carretera Jalpan-Arroyo Seco',
        descripcion: 'Carnes asadas al carbón, costillas BBQ y cortes premium. Ambiente familiar con área de juegos.',
        imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop'
      },
      {
        id: 6,
        nombre: 'Antojitos El Portal',
        ubicacion: 'Portal del Centro, Arroyo Seco',
        descripcion: 'Los mejores antojitos mexicanos: quesadillas, sopes, tlacoyos y aguas frescas naturales.',
        imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop'
      },
      {
        id: 7,
        nombre: 'Restaurante Agua Viva',
        ubicacion: 'Zona de Cascadas',
        descripcion: 'Cocina fusión con ingredientes locales. Platillos gourmet inspirados en la biodiversidad de la sierra.',
        imagen: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop'
      },
      {
        id: 8,
        nombre: 'Mezcalería La Joya',
        ubicacion: 'Calle Morelos, Arroyo Seco',
        descripcion: 'Mezcales artesanales de la región, botanas tradicionales y música en vivo los fines de semana.',
        imagen: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=600&h=400&fit=crop'
      }
    ];
  }

  get filtered(): Establecimiento[] {
    if (this.loading || this.error) return this.establecimientos;
    let result = this.establecimientos.filter(e =>
      e.nombre.toLowerCase().includes(this.search.toLowerCase()) ||
      e.ubicacion.toLowerCase().includes(this.search.toLowerCase())
    );
    switch (this.sortMode) {
      case 'nombre':
        result = [...result].sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'ubicacion':
        result = [...result].sort((a, b) => a.ubicacion.localeCompare(b.ubicacion));
        break;
    }
    return result;
  }

  navigateToDetail(id: number) {
    if (this.isPublic && !this.auth.isAuthenticated()) {
      this.toast.error('Debes iniciar sesión para ver detalles');
      this.router.navigate(['/login']);
      return;
    }
    
    const route = this.isPublic ? '/publica/gastronomia' : '/cliente/gastronomia';
    this.router.navigate([route, id]);
  }
}
