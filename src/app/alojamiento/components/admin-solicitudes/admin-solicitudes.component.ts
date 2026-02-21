import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { AdminOferentesService } from '../../services/admin-oferentes.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

interface Solicitud {
  id: number;
  nombre: string;
  telefono: string;
  contexto: string;
  tipoNegocio: number;
  tipoTexto: string;
  fechaSolicitud?: string;
  estado?: string;
}

@Component({
  selector: 'app-admin-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-solicitudes.component.html',
  styleUrl: './admin-solicitudes.component.scss'
})
export class AdminSolicitudesComponent implements OnInit {
  private adminService = inject(AdminOferentesService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  solicitudes: Solicitud[] = [];
  loading = false;
  searchTerm = '';
  tipoFiltro: number | null = null; // 1=Alojamiento, 2=Gastronomía, null=Todos

  private readonly MOCK_SOLICITUDES: Solicitud[] = [
    { id: 1, nombre: 'Juan Carlos Méndez', telefono: '442-111-2233', contexto: 'Cabaña familiar en zona boscosa con vista al río, capacidad para 8 personas. Operamos desde 2018.', tipoNegocio: 1, tipoTexto: 'Alojamiento', fechaSolicitud: '2025-01-15T10:30:00', estado: 'Pendiente' },
    { id: 2, nombre: 'Elena Ríos Paredes', telefono: '442-222-3344', contexto: 'Restaurante de comida tradicional queretana con 15 años de experiencia. Capacidad 40 comensales.', tipoNegocio: 2, tipoTexto: 'Gastronomía', fechaSolicitud: '2025-01-14T14:15:00', estado: 'Pendiente' },
    { id: 3, nombre: 'Fernando Aguilar', telefono: '442-333-4455', contexto: 'Hotel boutique con restaurante integrado. 12 habitaciones y salón de eventos.', tipoNegocio: 3, tipoTexto: 'Ambos', fechaSolicitud: '2025-01-13T09:00:00', estado: 'Pendiente' },
    { id: 4, nombre: 'Patricia Vázquez Luna', telefono: '442-444-5566', contexto: 'Posada campestre con desayuno incluido. Ideal para turismo de naturaleza.', tipoNegocio: 1, tipoTexto: 'Alojamiento', fechaSolicitud: '2025-01-12T16:45:00', estado: 'Pendiente' },
    { id: 5, nombre: 'Diego Morales Ortiz', telefono: '442-555-6677', contexto: 'Food truck de tacos y antojitos mexicanos. Participamos en eventos y ferias locales.', tipoNegocio: 2, tipoTexto: 'Gastronomía', fechaSolicitud: '2025-01-11T11:20:00', estado: 'Pendiente' },
    { id: 6, nombre: 'Gabriela Flores Castillo', telefono: '442-666-7788', contexto: 'Departamento turístico amueblado tipo Airbnb. Ubicado en el centro histórico.', tipoNegocio: 1, tipoTexto: 'Alojamiento', fechaSolicitud: '2025-01-10T08:30:00', estado: 'Pendiente' },
  ];

  ngOnInit(): void {
    // Detectar si viene de gastronomía o alojamiento
    this.detectarTipoDesdeRuta();
    this.cargarSolicitudes();
    
    // Escuchar cambios de navegación
    this.router.events.pipe(
      first(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.detectarTipoDesdeRuta();
    });
  }

  private detectarTipoDesdeRuta(): void {
    const url = this.router.url;
    
    // Si la URL contiene 'gastronomia', filtrar por gastronomía
    if (url.includes('/gastronomia')) {
      this.tipoFiltro = 2; // Gastronomía
    } 
    // Si la URL es de admin pero no contiene gastronomia, es alojamiento
    else if (url.includes('/admin/solicitudes')) {
      this.tipoFiltro = 1; // Alojamiento
    }
    // Por defecto, alojamiento
    else {
      this.tipoFiltro = 1;
    }
  }

  cargarSolicitudes() {
    this.loading = true;
    this.adminService.listSolicitudes().pipe(first()).subscribe({
      next: (data) => {
        let solicitudesFiltradas = data || [];
        
        // Filtrar por tipo si está definido
        if (this.tipoFiltro !== null) {
          solicitudesFiltradas = solicitudesFiltradas.filter(s => 
            s.tipoSolicitado === this.tipoFiltro || s.tipoSolicitado === 3 // 3 = Ambos
          );
        }
        
        this.solicitudes = solicitudesFiltradas.map(s => ({
          id: s.id,
          nombre: s.nombreSolicitante,
          telefono: s.telefono || '',
          contexto: s.mensaje,
          tipoNegocio: s.tipoSolicitado,
          tipoTexto: this.getTipoTexto(s.tipoSolicitado),
          fechaSolicitud: s.fechaSolicitud,
          estado: s.estatus
        }));
        if (this.solicitudes.length === 0) {
          this.solicitudes = this.MOCK_SOLICITUDES.filter(s =>
            this.tipoFiltro === null || s.tipoNegocio === this.tipoFiltro || s.tipoNegocio === 3
          );
        }
        this.loading = false;
      },
      error: (err) => {
        this.solicitudes = this.MOCK_SOLICITUDES.filter(s =>
          this.tipoFiltro === null || s.tipoNegocio === this.tipoFiltro || s.tipoNegocio === 3
        );
        console.error('Error al cargar solicitudes, usando datos de demostración:', err);
        this.loading = false;
      }
    });
  }

  get filteredSolicitudes(): Solicitud[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.solicitudes;
    return this.solicitudes.filter(s => 
      s.nombre.toLowerCase().includes(term) || 
      s.telefono.includes(term) ||
      s.tipoTexto.toLowerCase().includes(term)
    );
  }

  getTipoTexto(tipo: number): string {
    switch (tipo) {
      case 1: return 'Alojamiento';
      case 2: return 'Gastronomía';
      case 3: return 'Ambos';
      default: return 'No especificado';
    }
  }

  getTituloFiltro(): string {
    if (this.tipoFiltro === 1) return '- Alojamiento';
    if (this.tipoFiltro === 2) return '- Gastronomía';
    return '';
  }

  aprobar(solicitud: Solicitud) {
    if (!confirm(`¿Aprobar solicitud de ${solicitud.nombre}?`)) return;

    this.adminService.aprobarSolicitud(solicitud.id, solicitud.tipoNegocio).pipe(first()).subscribe({
      next: () => {
        this.toastService.success(`Solicitud de ${solicitud.nombre} aprobada`);
        this.cargarSolicitudes();
      },
      error: (err) => {
        this.toastService.error('Error al aprobar solicitud');
        console.error('Error aprobar:', err);
        console.error('Response:', err.error);
        console.error('Status:', err.status);
      }
    });
  }

  rechazar(solicitud: Solicitud) {
    if (!confirm(`¿Rechazar solicitud de ${solicitud.nombre}?`)) return;

    this.adminService.rechazarSolicitud(solicitud.id).pipe(first()).subscribe({
      next: () => {
        this.toastService.warning(`Solicitud de ${solicitud.nombre} rechazada`);
        this.cargarSolicitudes();
      },
      error: (err) => {
        this.toastService.error('Error al rechazar solicitud');
        console.error('Error rechazar:', err);
      }
    });
  }
}
