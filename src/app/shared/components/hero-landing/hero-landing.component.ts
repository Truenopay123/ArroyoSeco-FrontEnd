import { Component, HostListener, OnInit, OnDestroy, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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

  sectionsVisible: Record<string, boolean> = {
    hero: false,
    intro: false,
    landscape: false,
    properties: false,
    experience: false
  };

  private observer!: IntersectionObserver;

  readonly featuredCabanas = [
    {
      id: 1,
      nombre: 'Cabaña El Encino',
      descripcion: 'Cabaña rústica con vista al río, rodeada de vegetación nativa.',
      capacidad: '2–4 huéspedes',
      precio: '$1,200 / noche',
      imagen: 'assets/images/CabañaAyutla.png'
    },
    {
      id: 2,
      nombre: 'Cabaña Sierra Gorda',
      descripcion: 'Experiencia inmersiva en la sierra con terraza panorámica.',
      capacidad: '2–6 huéspedes',
      precio: '$1,850 / noche',
      imagen: 'assets/images/CabañaAyutla2.png'
    },
    {
      id: 3,
      nombre: 'Cabaña Río Escanela',
      descripcion: 'A orillas del río, ideal para desconectar y disfrutar la naturaleza.',
      capacidad: '2–4 huéspedes',
      precio: '$2,200 / noche',
      imagen: 'assets/images/CabañaAyutla3.png'
    }
  ];

  constructor(
    private readonly router: Router,
    private readonly el: ElementRef,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
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
