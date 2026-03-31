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

  errorTelefono = '';

  readonly destino = 'alojamientosarroyoseco@gmail.com';

  validarTelefono(): boolean {
    this.errorTelefono = '';
    const tel = this.model.telefono.trim();
    if (!tel) return true; // es opcional
    const soloDigitos = tel.replace(/[\s\-\(\)\+]/g, '');
    if (!/^\d+$/.test(soloDigitos)) {
      this.errorTelefono = 'El teléfono solo debe contener números';
      return false;
    }
    if (soloDigitos.startsWith('52') && soloDigitos.length === 12) return true;
    if (soloDigitos.length !== 10) {
      this.errorTelefono = 'El teléfono debe tener exactamente 10 dígitos';
      return false;
    }
    return true;
  }

  volverAtras() {
    window.history.back();
  }

  enviarContacto() {
    if (this.model.telefono.trim() && !this.validarTelefono()) return;
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
