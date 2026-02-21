import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { PublicNavbarComponent } from '../public-navbar/public-navbar.component';
import { HeroLandingComponent } from '../hero-landing/hero-landing.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PublicNavbarComponent, HeroLandingComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent {
  showHero = true;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      // Show hero only on main listing pages
      this.showHero = /\/publica(\/alojamientos|\/gastronomia)?\/?$/.test(e.urlAfterRedirects);
    });
  }
}
