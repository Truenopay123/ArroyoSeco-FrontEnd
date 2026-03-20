import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-oferente-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor],
  templateUrl: './oferente-navbar.component.html',
  styleUrl: './oferente-navbar.component.scss'
})
export class OferenteNavbarComponent {
  readonly links: NavLink[] = [
    { label: 'Inicio', route: '/oferente/dashboard' },
    { label: 'Mis Hospedajes', route: '/oferente/hospedajes' },
    { label: 'Gestión de Reservas', route: '/oferente/reservas' },
    { label: 'Reseñas', route: '/oferente/resenas' },
    { label: 'Notificaciones', route: '/oferente/notificaciones' },
    { label: 'Configuración', route: '/oferente/configuracion' }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  menuOpen = false;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
