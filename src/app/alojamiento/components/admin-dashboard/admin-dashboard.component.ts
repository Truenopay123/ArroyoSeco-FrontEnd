import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe } from '@angular/common';

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
  imports: [RouterLink, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  readonly stats: StatCard[] = [
    { label: 'Oferentes activos', value: '24', change: '+3 este mes', positive: true, icon: 'person' },
    { label: 'Reservas del mes', value: '156', change: '+12% vs. anterior', positive: true, icon: 'calendar' },
    { label: 'Ingresos estimados', value: '$2.4M', change: '+8.5%', positive: true, icon: 'money' },
    { label: 'Solicitudes pendientes', value: '7', change: '3 nuevas hoy', positive: false, icon: 'pending' }
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
    }
  ];

  readonly recentActivity: RecentActivity[] = [
    { text: 'Nuevo oferente registrado: Cabaña Los Álamos', date: new Date(Date.now() - 1000 * 60 * 30), type: 'oferente' },
    { text: 'Reserva confirmada #1042 - Hostería del Río', date: new Date(Date.now() - 1000 * 60 * 60 * 2), type: 'reserva' },
    { text: 'Notificación enviada a 12 oferentes', date: new Date(Date.now() - 1000 * 60 * 60 * 4), type: 'notificacion' },
    { text: 'Solicitud recibida: Posada Mendoza', date: new Date(Date.now() - 1000 * 60 * 60 * 6), type: 'solicitud' },
    { text: 'Reserva cancelada #1038 - Hotel Central', date: new Date(Date.now() - 1000 * 60 * 60 * 8), type: 'reserva' },
    { text: 'Oferente actualizado: Lodge Arroyo', date: new Date(Date.now() - 1000 * 60 * 60 * 12), type: 'oferente' },
    { text: 'Solicitud aprobada: Restaurante El Patio', date: new Date(Date.now() - 1000 * 60 * 60 * 24), type: 'solicitud' }
  ];
}
