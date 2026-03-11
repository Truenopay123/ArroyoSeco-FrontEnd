import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface BottomItem { path: string; label: string; icon: string; }

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrls: ['./mobile-bottom-nav.component.scss']
})
export class MobileBottomNavComponent {
  constructor(private router: Router, private auth: AuthService) {}

  isLoggedIn = computed(() => !!this.auth.getToken());

  private isGastronomiaContext(url: string): boolean {
    return /gastronomia/.test(url);
  }

  items = computed<BottomItem[]>(() => {
    if (!this.isLoggedIn()) return [];
    const roles = this.auth.getRoles().map(r => r.toLowerCase());
    const url = this.router.url;
    const gastro = this.isGastronomiaContext(url);

    const isAdmin = roles.some(r => r.includes('admin'));
    const isOferente = roles.some(r => r.includes('oferente'));
    const isCliente = roles.some(r => r.includes('cliente')) || (!isAdmin && !isOferente);

    if (isAdmin) {
      if (gastro) {
        return [
          { path: '/admin/gastronomia/dashboard', label: 'Inicio', icon: 'home' },
          { path: '/admin/gastronomia/solicitudes', label: 'Solicitudes', icon: 'assignment' },
          { path: '/admin/gastronomia/notificaciones', label: 'Notif.', icon: 'notifications' }
        ];
      }
      return [
        { path: '/admin/dashboard', label: 'Inicio', icon: 'home' },
        { path: '/admin/solicitudes', label: 'Solicitudes', icon: 'assignment' },
        { path: '/admin/notificaciones', label: 'Notif.', icon: 'notifications' }
      ];
    }

    if (isOferente) {
      if (gastro) {
        return [
          { path: '/oferente/gastronomia/dashboard', label: 'Inicio', icon: 'home' },
          { path: '/oferente/gastronomia/reservas', label: 'Reservas', icon: 'event' },
          { path: '/oferente/gastronomia/configuracion', label: 'Config.', icon: 'settings' }
        ];
      }
      return [
        { path: '/oferente/dashboard', label: 'Inicio', icon: 'home' },
        { path: '/oferente/reservas', label: 'Reservas', icon: 'event' },
        { path: '/oferente/configuracion', label: 'Config.', icon: 'settings' }
      ];
    }

    if (isCliente) {
      if (gastro) {
        return [
          { path: '/cliente/gastronomia', label: 'Inicio', icon: 'restaurant' },
          { path: '/cliente/gastronomia/reservas', label: 'Reservas', icon: 'event' },
          { path: '/cliente/notificaciones', label: 'Notif.', icon: 'notifications' },
          { path: '/cliente/perfil', label: 'Perfil', icon: 'person' },
          { path: '/cliente/seguridad', label: 'Seguridad', icon: 'verified_user' },
          { path: '/cliente/alojamientos', label: 'Hospedajes', icon: 'hotel' }
        ];
      }
      return [
        { path: '/cliente/alojamientos', label: 'Inicio', icon: 'home' },
        { path: '/cliente/reservas', label: 'Reservas', icon: 'event' },
        { path: '/cliente/favoritos', label: 'Favoritos', icon: 'favorite' },
        { path: '/cliente/notificaciones', label: 'Notif.', icon: 'notifications' },
        { path: '/cliente/perfil', label: 'Perfil', icon: 'person' },
        { path: '/cliente/seguridad', label: 'Seguridad', icon: 'verified_user' },
        { path: '/cliente/gastronomia', label: 'Rest.', icon: 'restaurant' }
      ];
    }
    return [];
  });
}
