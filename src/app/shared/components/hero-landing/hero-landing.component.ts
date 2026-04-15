import { Component, HostListener, OnInit, OnDestroy, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-hero-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-landing.component.html',
  styleUrl: './hero-landing.component.scss'
})
export class HeroLandingComponent implements OnInit, OnDestroy {
  cursorX = 0;
  cursorY = 0;
  cursorVisible = false;
  isGastronomia = false;

  sectionsVisible: Record<string, boolean> = {
    hero: false,
    intro: false,
    landscape: false,
    properties: false,
    experience: false
  };

  private observer!: IntersectionObserver;
  private routerSub?: Subscription;

  readonly featuredCabanas = [
    {
      id: 1,
      nombre: 'Cabaña Higueron',
      descripcion: 'Cabaña rústica con vista al río, rodeada de vegetación nativa.',
      capacidad: '16 huéspedes',
      precio: '$1,600 / noche',
      imagen: 'assets/images/CabañaAyutla.png'
    },
    {
      id: 2,
      nombre: 'Cabaña Conca',
      descripcion: 'Experiencia inmersiva en la sierra con terraza panorámica.',
      capacidad: '2 huéspedes',
      precio: '$600 / noche',
      imagen: 'assets/images/CabañaAyutla4.jpeg'
    },
    {
      id: 3,
      nombre: 'Hotel JASAR',
      descripcion: 'A orillas del río, ideal para desconectar y disfrutar la naturaleza.',
      capacidad: '2–4 huéspedes',
      precio: '$1,200 / noche',
      imagen: 'assets/images/JASAR1.jpg'
    }
  ];

  readonly featuredRestaurantes = [
    {
      id: 1,
      nombre: 'Restaurante El Mirador',
      descripcion: 'Cocina tradicional queretana con vista panorámica al valle.',
      capacidad: 'Especialidad en carnes',
      precio: 'Comida regional',
      imagen: 'assets/images/RioCalidad.jpeg'
    },
    {
      id: 2,
      nombre: 'Fonda Doña María',
      descripcion: 'Comida casera de la Sierra Gorda. Famosa por sus gorditas y tamales.',
      capacidad: 'Cocina casera',
      precio: 'Antojitos serranos',
      imagen: 'assets/images/PaisajeCalidad.jpeg'
    },
    {
      id: 3,
      nombre: 'La Trucha Feliz',
      descripcion: 'Trucha fresca del río preparada al estilo serrano, junto al agua.',
      capacidad: 'Ambiente rústico',
      precio: 'Mariscos y trucha',
      imagen: 'assets/images/RioAyutla.jpeg'
    }
  ];

  get featuredItems() {
    return this.isGastronomia ? this.featuredRestaurantes : this.featuredCabanas;
  }

  get featuredRoute() {
    return this.isGastronomia ? '/publica/gastronomia/' : '/publica/alojamientos/';
  }

  constructor(
    private readonly router: Router,
    private readonly el: ElementRef,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    this.isGastronomia = this.router.url.includes('/gastronomia');
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      this.isGastronomia = e.urlAfterRedirects.includes('/gastronomia');
    });
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.routerSub?.unsubscribe();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.cursorX = e.clientX;
    this.cursorY = e.clientY;
    this.cursorVisible = true;
  }

  @HostListener('document:mouseleave')
  onMouseLeave() {
    this.cursorVisible = false;
  }

  scrollToSection(id: string) {
    const section = this.el.nativeElement.querySelector('#' + id);
    section?.scrollIntoView({ behavior: 'smooth' });
  }

  navigateTo(path: string) {
    this.router.navigateByUrl(path);
  }

  private setupIntersectionObserver(): void {
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => this.handleIntersection(entries),
        { threshold: 0.15 }
      );

      setTimeout(() => {
        const sections = this.el.nativeElement.querySelectorAll(
          '#hero, #intro, #landscape, #properties, #experience'
        );
        sections.forEach((s: Element) => this.observer.observe(s));
      });
    });
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        if (id && id in this.sectionsVisible) {
          this.zone.run(() => {
            this.sectionsVisible[id] = true;
          });
        }
      }
    });
  }
}
