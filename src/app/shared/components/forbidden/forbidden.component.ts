import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<section class="forbidden">
  <h1>403</h1>
  <h2>Acceso denegado</h2>
  <p>No tienes permisos para acceder a esta sección.</p>
  <a routerLink="/publica/alojamientos">Volver al inicio</a>
</section>
  `,
  styles: [
    `.forbidden { min-height: 60vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:2rem; }`,
    `h1 { font-size: 4rem; margin: 0; color:#b31217; }`,
    `h2 { margin: 0.25rem 0 0.75rem; }`,
    `a { margin-top: 1rem; color: #b31217; font-weight: 700; text-decoration: none; }`
  ]
})
export class ForbiddenComponent {}
