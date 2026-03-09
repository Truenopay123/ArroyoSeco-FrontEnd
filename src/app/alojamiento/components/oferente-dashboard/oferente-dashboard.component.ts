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
  private readonly alojamientosService = inject(AlojamientoService);
  private readonly reservasService = inject(ReservasService);

  alojamientosActivos = 0;
  reservasPendientes: number | null = null;
  ingresosMes = 0;
  ocupacionPromedio = 0;

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

  upcomingReservas: UpcomingReserva[] = [];

  occupancyBars = [
    { label: 'Ene', pct: 0 }, { label: 'Feb', pct: 0 }, { label: 'Mar', pct: 0 },
    { label: 'Abr', pct: 0 }, { label: 'May', pct: 0 }, { label: 'Jun', pct: 0 },
    { label: 'Jul', pct: 0 }, { label: 'Ago', pct: 0 }, { label: 'Sep', pct: 0 },
    { label: 'Oct', pct: 0 }, { label: 'Nov', pct: 0 }, { label: 'Dic', pct: 0 }
  ];

  ngOnInit(): void {
    this.cargarStats();
  }

  private buildStats() {
    this.stats = [
      { label: 'Propiedades activas', value: String(this.alojamientosActivos), change: 'Publicadas', positive: true, icon: 'home' },
      { label: 'Reservas pendientes', value: String(this.reservasPendientes ?? 0), change: 'Requieren atención', positive: false, icon: 'calendar' },
      { label: 'Ocupación promedio', value: `${this.ocupacionPromedio}%`, change: 'Basado en reservas', positive: this.ocupacionPromedio >= 50, icon: 'chart' },
      { label: 'Ingresos del mes', value: `$${Math.round(this.ingresosMes).toLocaleString('es-MX')} MXN`, change: 'Reservas confirmadas', positive: this.ingresosMes > 0, icon: 'money' }
    ];
  }

  private cargarStats() {
    this.alojamientosService.listMine().pipe(
      switchMap(list => {
        this.alojamientosActivos = list?.length ?? 0;
        const ids = (list || []).map(a => a.id).filter(Boolean) as number[];
        if (!ids.length) return of({ list: list || [], reservas: [] as any[] });

        return forkJoin(ids.map(id => this.reservasService.listByAlojamiento(id))).pipe(
          map(arr => ({ list: list || [], reservas: arr.flat() }))
        );
      }),
      first(),
      catchError(() => {
        this.reservasPendientes = 0;
        this.ingresosMes = 0;
        this.ocupacionPromedio = 0;
        this.upcomingReservas = [];
        this.occupancyBars = this.occupancyBars.map(b => ({ ...b, pct: 0 }));
        this.buildStats();
        return of({ list: [], reservas: [] as any[] });
      })
    ).subscribe(({ list, reservas }) => {
      const all = reservas || [];
      this.reservasPendientes = all.filter(r => ['Pendiente', 'PagoEnRevision'].includes(String(r.estado || ''))).length;

      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      this.ingresosMes = all
        .filter(r => String(r.estado || '').toLowerCase() === 'confirmada')
        .filter(r => {
          const d = new Date(r.fechaEntrada || r.fechaReserva || r.createdAt || now);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((sum, r) => sum + Number(r.total || 0), 0);

      const confirmadas = all.filter(r => String(r.estado || '').toLowerCase() === 'confirmada').length;
      this.ocupacionPromedio = all.length ? Math.round((confirmadas / all.length) * 100) : 0;

      const alojamientoNombreById = new Map<number, string>();
      (list || []).forEach((a: any) => alojamientoNombreById.set(Number(a.id), a.nombre || `Alojamiento #${a.id}`));

      this.upcomingReservas = all
        .map((r) => ({
          huesped: r.huesped || r.clienteNombre || r.usuarioEmail || 'Huésped',
          propiedad: alojamientoNombreById.get(Number(r.alojamientoId)) || r.hospedaje || 'Alojamiento',
          fechaInicio: new Date(r.fechaEntrada),
          fechaFin: new Date(r.fechaSalida),
          estado: r.estado || 'Pendiente',
          monto: Number(r.total || 0)
        }))
        .filter(r => !Number.isNaN(r.fechaInicio.getTime()) && r.fechaInicio >= now)
        .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())
        .slice(0, 5);

      const monthCount = new Array(12).fill(0);
      all.forEach(r => {
        const d = new Date(r.fechaEntrada || r.fechaReserva || now);
        if (!Number.isNaN(d.getTime()) && d.getFullYear() === year) {
          monthCount[d.getMonth()] += 1;
        }
      });
      const max = Math.max(1, ...monthCount);
      this.occupancyBars = this.occupancyBars.map((b, i) => ({ ...b, pct: Math.round((monthCount[i] / max) * 100) }));

      this.buildStats();
    });
  }
}
