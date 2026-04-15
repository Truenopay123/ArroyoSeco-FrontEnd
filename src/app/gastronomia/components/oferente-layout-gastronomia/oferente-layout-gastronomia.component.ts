import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OferenteNavbarGastronomiaComponent } from '../oferente-navbar-gastronomia/oferente-navbar-gastronomia.component';
import { OferenteFooterGastronomiaComponent } from '../oferente-footer-gastronomia/oferente-footer-gastronomia.component';

@Component({
  selector: 'app-oferente-layout-gastronomia',
  standalone: true,
  imports: [CommonModule, RouterOutlet, OferenteNavbarGastronomiaComponent, OferenteFooterGastronomiaComponent],
  templateUrl: './oferente-layout-gastronomia.component.html',
  styleUrls: ['./oferente-layout-gastronomia.component.scss']
})
export class OferenteLayoutGastronomiaComponent {
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
