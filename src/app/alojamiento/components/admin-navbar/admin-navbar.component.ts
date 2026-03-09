import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

interface NavLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-navbar.component.html',
  styleUrl: './admin-navbar.component.scss'
})
export class AdminNavbarComponent implements OnInit {
  links: NavLink[] = [];
  isGastronomia = false;
  homeRoute = '/admin/home';

  private readonly alojamientoLinks: NavLink[] = [
    { label: 'Dashboard',     route: '/admin/dashboard' },
    { label: 'Oferentes',     route: '/admin/oferentes' },
    { label: 'Solicitudes',   route: '/admin/solicitudes' },
    { label: 'Reseñas',       route: '/admin/resenas' },
    { label: 'Estadísticas',  route: '/admin/estadisticas' },
    { label: 'Notificaciones', route: '/admin/notificaciones' }
  ];

  private readonly gastronomiaLinks: NavLink[] = [
    { label: 'Dashboard', route: '/admin/gastronomia/dashboard' },
    { label: 'Oferentes', route: '/admin/gastronomia/oferentes' },
    { label: 'Solicitudes', route: '/admin/gastronomia/solicitudes' },
    { label: 'Reservas', route: '/admin/gastronomia/reservas' },
    { label: 'Notificaciones', route: '/admin/gastronomia/notificaciones' }
  ];

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    this.updateLinksBasedOnRoute(this.router.url);
    
    // Escuchar cambios de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateLinksBasedOnRoute(event.url);
      });
  }

  private updateLinksBasedOnRoute(url: string): void {
    this.isGastronomia = url.includes('/admin/gastronomia');
    this.links = this.isGastronomia ? this.gastronomiaLinks : this.alojamientoLinks;
    this.homeRoute = this.isGastronomia ? '/admin/gastronomia/dashboard' : '/admin/dashboard';
    
    console.log('🔍 Admin Navbar - URL actual:', url);
    console.log('🔍 Admin Navbar - Es gastronomía?', this.isGastronomia);
    console.log('🔍 Admin Navbar - Links actuales:', this.links);
  }

  menuOpen = false;
  toggleMenu() { this.menuOpen = !this.menuOpen; }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
