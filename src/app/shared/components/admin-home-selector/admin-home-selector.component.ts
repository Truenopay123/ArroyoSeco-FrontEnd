import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface ModuleType {
  title: string;
  description: string;
  route: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-admin-home-selector',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-home-selector.component.html',
  styleUrl: './admin-home-selector.component.scss'
})
export class AdminHomeSelectorComponent {
  constructor(private router: Router) {}

  readonly modules: ModuleType[] = [
    {
      title: 'Alojamiento',
      description: 'Gestiona hospedajes, oferentes y reservas',
      route: '/admin/dashboard',
      icon: 'alojamiento',
      color: '#E31B23'
    },
    {
      title: 'Gastronomía',
      description: 'Gestiona restaurantes, oferentes y reservas',
      route: '/admin/gastronomia/dashboard',
      icon: 'gastronomia',
      color: '#E31B23'
    }
  ];
}
