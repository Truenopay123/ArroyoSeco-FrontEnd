import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-navbar.component.html',
  styleUrl: './public-navbar.component.scss'
})
export class PublicNavbarComponent implements OnInit {
  isLoading = false;
  experienceType: 'alojamiento' | 'gastronomia' = 'alojamiento';

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    const savedExperience = sessionStorage.getItem('experienceType') || 'alojamiento';
    this.experienceType = savedExperience as 'alojamiento' | 'gastronomia';
  }

  switchExperience(type: 'alojamiento' | 'gastronomia') {
    this.experienceType = type;
    sessionStorage.setItem('experienceType', type);
    
    if (type === 'alojamiento') {
      this.router.navigate(['/publica/alojamientos']);
    } else {
      this.router.navigate(['/publica/gastronomia']);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  menuOpen = false;
  toggleMenu() { this.menuOpen = !this.menuOpen; }
}
