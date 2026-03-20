import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.scss']
})
export class ContactoComponent {
  model = {
    nombre: '',
    email: '',
    telefono: '',
    mensaje: ''
  };

  readonly destino = 'alojamientosarroyoseco@gmail.com';

  volverAtras() {
    window.history.back();
  }

  enviarContacto() {
    const subject = `Contacto Arroyo Seco - ${this.model.nombre || 'Sin nombre'}`;
    const body = [
      `Nombre: ${this.model.nombre}`,
      `Correo: ${this.model.email}`,
      `Telefono: ${this.model.telefono || 'No proporcionado'}`,
      '',
      'Mensaje:',
      this.model.mensaje
    ].join('\n');

    const mailtoUrl = `mailto:${this.destino}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }
}
