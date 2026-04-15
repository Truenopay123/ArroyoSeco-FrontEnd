import { Component, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { FavoritesGastronomiaService } from '../../../shared/services/favorites-gastronomia.service';

@Component({
  selector: 'app-cliente-navbar-gastronomia',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cliente-navbar-gastronomia.component.html',
  styleUrls: ['./cliente-navbar-gastronomia.component.scss']
})
export class ClienteNavbarGastronomiaComponent {
  menuOpen = false;
  favCount = computed(() => this.favs.getAll().length);

  constructor(private auth: AuthService, private router: Router, private favs: FavoritesGastronomiaService) {}

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logout() {
    this.menuOpen = false;
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
