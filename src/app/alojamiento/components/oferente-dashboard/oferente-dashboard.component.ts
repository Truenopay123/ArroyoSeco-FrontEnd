import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, CurrencyPipe } from '@angular/common';
import { AlojamientoService } from '../../services/alojamiento.service';
import { ReservasService } from '../../services/reservas.service';
import { first, switchMap, map, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

interface DashboardCard {
  title: string;
  description: string;
  icon: string;
  route: string;
}

interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
}

interface UpcomingReserva {
  huesped: string;
  propiedad: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: string;
  monto: number;
}

@Component({
  selector: 'app-oferente-dashboard',
  standalone: true,
  imports: [RouterLink, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, CurrencyPipe],
  templateUrl: './oferente-dashboard.component.html',
  styleUrl: './oferente-dashboard.component.scss'
})
export class OferenteDashboardComponent implements OnInit {
  private alojamientosService = inject(AlojamientoService);
  private reservasService = inject(ReservasService);

  alojamientosActivos = 0;
  reservasPendientes: number | null = null;

  stats: StatCard[] = [];

  readonly cards: DashboardCard[] = [
    {
      title: 'Gestión de Hospedajes',
      description: 'Administra tus propiedades y alojamientos.',
      icon: 'home',
      route: '/oferente/hospedajes'
    },
    {
      title: 'Gestión de Reservas',
      description: 'Consulta y gestiona las reservas de tus hospedajes.',
      icon: 'calendar',
      route: '/oferente/reservas'
    },
    {
      title: 'Notificaciones',
      description: 'Revisa tus avisos y mensajes importantes.',
      icon: 'notifications',
      route: '/oferente/notificaciones'
    },
    {
      title: 'Configuración',
      description: 'Ajusta tu perfil y preferencias.',
      icon: 'settings',
      route: '/oferente/configuracion'
    }
  ];

  readonly upcomingReservas: UpcomingReserva[] = [
    { huesped: 'María González', propiedad: 'Cabaña del Río', fechaInicio: new Date(Date.now() + 86400000 * 2), fechaFin: new Date(Date.now() + 86400000 * 5), estado: 'Confirmada', monto: 45000 },
    { huesped: 'Carlos Rodríguez', propiedad: 'Suite Arroyo', fechaInicio: new Date(Date.now() + 86400000 * 4), fechaFin: new Date(Date.now() + 86400000 * 7), estado: 'Pendiente', monto: 62000 },
    { huesped: 'Ana Martínez', propiedad: 'Cabaña del Río', fechaInicio: new Date(Date.now() + 86400000 * 8), fechaFin: new Date(Date.now() + 86400000 * 10), estado: 'Confirmada', monto: 30000 },
    { huesped: 'Luis Fernández', propiedad: 'Depto Centro', fechaInicio: new Date(Date.now() + 86400000 * 12), fechaFin: new Date(Date.now() + 86400000 * 14), estado: 'PagoEnRevision', monto: 28000 },
    { huesped: 'Sofía López', propiedad: 'Suite Arroyo', fechaInicio: new Date(Date.now() + 86400000 * 15), fechaFin: new Date(Date.now() + 86400000 * 18), estado: 'Confirmada', monto: 93000 }
  ];

  readonly occupancyBars = [
    { label: 'Ene', pct: 45 }, { label: 'Feb', pct: 62 }, { label: 'Mar', pct: 78 },
    { label: 'Abr', pct: 55 }, { label: 'May', pct: 40 }, { label: 'Jun', pct: 85 },
    { label: 'Jul', pct: 92 }, { label: 'Ago', pct: 88 }, { label: 'Sep', pct: 70 },
    { label: 'Oct', pct: 58 }, { label: 'Nov', pct: 50 }, { label: 'Dic', pct: 75 }
  ];

  ngOnInit(): void {
    this.cargarStats();
  }

  private buildStats() {
    this.stats = [
      { label: 'Propiedades activas', value: String(this.alojamientosActivos), change: 'Publicadas', positive: true, icon: 'home' },
      { label: 'Reservas pendientes', value: String(this.reservasPendientes ?? 0), change: 'Requieren atención', positive: false, icon: 'calendar' },
      { label: 'Ocupación promedio', value: '72%', change: '+5% vs. mes anterior', positive: true, icon: 'chart' },
      { label: 'Ingresos del mes', value: '$258K', change: '+12.3%', positive: true, icon: 'money' }
    ];
  }

  private cargarStats() {
    this.alojamientosService.listMine().pipe(first()).subscribe({
      next: (list) => { this.alojamientosActivos = list?.length ?? 0; this.buildStats(); },
      error: () => { this.alojamientosActivos = 0; this.buildStats(); }
    });

    this.alojamientosService.listMine().pipe(
      switchMap(list => {
        const ids = (list || []).map(a => a.id).filter(Boolean) as number[];
        if (!ids.length) return of([] as any[]);
        const pendientes$ = forkJoin(ids.map(id => this.reservasService.listByAlojamiento(id, 'Pendiente'))).pipe(map(arr => arr.flat()));
        const pagoRev$ = forkJoin(ids.map(id => this.reservasService.listByAlojamiento(id, 'PagoEnRevision'))).pipe(map(arr => arr.flat()));
        return forkJoin([pendientes$, pagoRev$]).pipe(map(([p, r]) => [...p, ...r]));
      }),
      first(),
      catchError(() => {
        this.reservasPendientes = 0;
        this.buildStats();
        return of([] as any[]);
      })
    ).subscribe(all => {
      this.reservasPendientes = (all || []).length;
      this.buildStats();
    });
  }
}
