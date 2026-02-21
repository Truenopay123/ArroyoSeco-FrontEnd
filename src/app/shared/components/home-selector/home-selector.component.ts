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
  selector: 'app-home-selector',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-selector.component.html',
  styleUrl: './home-selector.component.scss'
})
export class HomeSelectorComponent {
  constructor(private router: Router) {}

  readonly modules: ModuleType[] = [
    {
      title: 'Alojamiento',
      description: 'Busca y reserva hospedajes en Arroyo Seco',
      route: '/cliente/alojamientos',
      icon: 'alojamiento',
      color: '#E31B23'
    },
    {
      title: 'Gastronomía',
      description: 'Descubre restaurantes y reserva tu mesa',
      route: '/cliente/gastronomia',
      icon: 'gastronomia',
      color: '#E31B23'
    }
  ];
}
