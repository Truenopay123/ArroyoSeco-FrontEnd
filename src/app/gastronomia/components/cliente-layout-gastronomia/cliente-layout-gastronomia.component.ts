import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClienteNavbarGastronomiaComponent } from '../cliente-navbar-gastronomia/cliente-navbar-gastronomia.component';
import { ClienteFooterGastronomiaComponent } from '../cliente-footer-gastronomia/cliente-footer-gastronomia.component';

@Component({
  selector: 'app-cliente-layout-gastronomia',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ClienteNavbarGastronomiaComponent, ClienteFooterGastronomiaComponent],
  templateUrl: './cliente-layout-gastronomia.component.html',
  styleUrls: ['./cliente-layout-gastronomia.component.scss']
})
export class ClienteLayoutGastronomiaComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  heroTitle = '';
  heroSubtitle = '';
  heroImage = '';

  constructor() {
    this.router.events
      .pipe(
        filter((event: unknown): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.updateHero());

    this.updateHero();
  }

  private updateHero(): void {
    const deepest = this.getDeepestChild(this.route);
    const data = deepest?.snapshot?.data ?? {};
    this.heroTitle = data['heroTitle'] || '';
    this.heroSubtitle = data['heroSubtitle'] || '';
    this.heroImage = data['heroImage'] || '';
  }

  private getDeepestChild(route: ActivatedRoute | null): ActivatedRoute | null {
    let current = route;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}
