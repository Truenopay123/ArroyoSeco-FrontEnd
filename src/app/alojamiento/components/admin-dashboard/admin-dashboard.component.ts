import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, SlicePipe } from '@angular/common';
import { first } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { AdminDashboardService } from '../../services/admin-dashboard.service';

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

interface RecentActivity {
  text: string;
  date: Date;
  type: 'oferente' | 'reserva' | 'notificacion' | 'solicitud';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, SlicePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly dashboardService = inject(AdminDashboardService);
  turismoResumen: any = null;
  turismoPorSexo: Array<{ categoria: string; cantidad: number }> = [];
  turismoPorEdad: Array<{ categoria: string; cantidad: number }> = [];
  turismoPorOrigen: Array<{ ciudad: string; cantidad: number }> = [];

  stats: StatCard[] = [
    { label: 'Oferentes activos', value: '0', change: 'Registros reales', positive: true, icon: 'person' },
    { label: 'Reservas del mes', value: '0', change: 'Registros reales', positive: true, icon: 'calendar' },
    { label: 'Ingresos del mes', value: '$0 MXN', change: 'Reservas confirmadas', positive: true, icon: 'money' },
    { label: 'Solicitudes pendientes', value: '0', change: 'Pendientes de revisión', positive: false, icon: 'pending' }
  ];

  readonly cards: DashboardCard[] = [
    {
      title: 'Gestión de Oferentes',
      description: 'Administra la información de los oferentes registrados.',
      icon: 'person',
      route: '/admin/oferentes'
    },
    {
      title: 'Notificaciones',
      description: 'Consulta y gestiona los avisos enviados a los oferentes.',
      icon: 'notifications',
      route: '/admin/notificaciones'
    },
    {
      title: 'Solicitudes',
      description: 'Revisa las solicitudes de nuevos oferentes.',
      icon: 'solicitudes',
      route: '/admin/solicitudes'
    },
    {
      title: 'Gastronomía',
      description: 'Gestiona establecimientos gastronómicos de la zona.',
      icon: 'food',
      route: '/admin/gastronomia'
    },
    {
      title: 'Moderar reseñas',
      description: 'Aprueba, rechaza o elimina reseñas de clientes.',
      icon: 'notifications',
      route: '/admin/resenas'
    }
  ];

  recentActivity: RecentActivity[] = [];

  ngOnInit(): void {
    this.dashboardService.getResumen().pipe(first()).subscribe({
      next: (res) => {
        this.stats = [
          {
            label: 'Oferentes activos',
            value: String(res.oferentesActivos ?? 0),
            change: 'Registros reales',
            positive: true,
            icon: 'person'
          },
          {
            label: 'Reservas del mes',
            value: String(res.reservasMes ?? 0),
            change: 'Registros reales',
            positive: true,
            icon: 'calendar'
          },
          {
            label: 'Ingresos del mes',
            value: `$${Math.round(Number(res.ingresosMes || 0)).toLocaleString('es-MX')} MXN`,
            change: 'Reservas confirmadas',
            positive: Number(res.ingresosMes || 0) > 0,
            icon: 'money'
          },
          {
            label: 'Solicitudes pendientes',
            value: String(res.solicitudesPendientes ?? 0),
            change: 'Pendientes de revisión',
            positive: false,
            icon: 'pending'
          }
        ];

        this.recentActivity = (res.recentActivity || []).map(item => ({
          text: item.text,
          date: new Date(item.date),
          type: item.type || 'notificacion'
        }));
      },
      error: () => {
        this.recentActivity = [];
      }
    });

    forkJoin({
      resumen: this.dashboardService.getTurismoResumen(),
      sexo: this.dashboardService.getTurismoPorSexo(),
      edad: this.dashboardService.getTurismoPorEdad(),
      origen: this.dashboardService.getTurismoPorOrigen()
    }).pipe(first()).subscribe({
      next: ({ resumen, sexo, edad, origen }) => {
        this.turismoResumen = resumen;
        this.turismoPorSexo = (sexo || []) as any;
        this.turismoPorEdad = (edad || []) as any;
        this.turismoPorOrigen = (origen || []) as any;
      },
      error: () => {
        this.turismoResumen = null;
      }
    });
  }
}
