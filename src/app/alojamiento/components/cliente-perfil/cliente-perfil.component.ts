import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';

interface Perfil {
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  sexo: string;
}

@Component({
  selector: 'app-cliente-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente-perfil.component.html',
  styleUrls: ['./cliente-perfil.component.scss']
})
export class ClientePerfilComponent implements OnInit {
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private modalService = inject(ConfirmModalService);

  perfil = signal<Perfil>({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    sexo: ''
  });

  readonly opcionesSexo = [
    { value: 'Hombre', label: 'Hombre' },
    { value: 'Mujer', label: 'Mujer' },
    { value: 'Otro', label: 'Otro' }
  ];

  mostrarCambioPassword = false;
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmacion = '';
  submittingPassword = false;
  errorTelefono = '';

  ngOnInit() {
    this.authService.me().subscribe({
      next: (me: any) => {
        const token = this.authService.getToken();
        const payload = token ? this.decodeToken(token) : {};
        this.perfil.set({
          nombre: me?.nombre || me?.name || payload['name'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'Usuario',
          email: me?.email || payload['email'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '',
          telefono: me?.telefono || me?.phoneNumber || payload['phone'] || '',
          direccion: me?.direccion || '',
          ciudad: me?.ciudad || '',
          sexo: me?.sexo || ''
        });
      },
      error: () => {
        const token = this.authService.getToken();
        if (!token) return;
        const payload = this.decodeToken(token);
        this.perfil.set({
          nombre: payload['name'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'Usuario',
          email: payload['email'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '',
          telefono: payload['phone'] || '',
          direccion: '',
          ciudad: '',
          sexo: payload['sexo'] || ''
        });
      }
    });
  }

  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return {};
    }
  }

  validarTelefono(): boolean {
    this.errorTelefono = '';
    const tel = (this.perfil().telefono || '').trim();
    if (!tel) {
      this.errorTelefono = 'El teléfono es obligatorio';
      return false;
    }
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

  guardarPerfil() {
    if (!this.validarTelefono()) {
      this.toastService.error(this.errorTelefono);
      return;
    }
    const { nombre, email, telefono, sexo } = this.perfil();
    this.usuarioService.updatePerfil({ nombre, email, telefono }).subscribe({
      next: () => {
        this.authService.updateDemografia({ sexo: sexo || undefined }).subscribe({
          next: async () => {
            await this.modalService.confirm({ title: 'Perfil actualizado', message: 'Tus datos han sido guardados correctamente.', confirmText: 'Aceptar' });
          },
          error: async () => {
            await this.modalService.confirm({ title: 'Perfil actualizado parcialmente', message: 'Se guardaron tus datos principales, pero no fue posible actualizar el sexo.', confirmText: 'Aceptar' });
          }
        });
      },
      error: (err) => {
        console.error('Error al actualizar perfil:', err);
        this.toastService.error('No fue posible actualizar tu perfil');
      }
    });
  }

  toggleCambioPassword() {
    this.mostrarCambioPassword = !this.mostrarCambioPassword;
    if (!this.mostrarCambioPassword) {
      this.resetPasswordForm();
    }
  }

  cambiarPassword() {
    if (this.submittingPassword) {
      return;
    }

    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmacion) {
      this.toastService.error('Completa todos los campos de contraseña');
      return;
    }

    if (this.passwordNueva !== this.passwordConfirmacion) {
      this.toastService.error('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    if (this.passwordNueva.length < 8) {
      this.toastService.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!/[A-Z]/.test(this.passwordNueva)) {
      this.toastService.error('La contraseña debe incluir al menos una mayúscula');
      return;
    }

    if (!/[0-9]/.test(this.passwordNueva)) {
      this.toastService.error('La contraseña debe incluir al menos un número');
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(this.passwordNueva)) {
      this.toastService.error('La contraseña debe incluir al menos un símbolo especial');
      return;
    }

    this.submittingPassword = true;

    this.authService.changePassword({
      passwordActual: this.passwordActual,
      passwordNueva: this.passwordNueva
    }).subscribe({
      next: async () => {
        this.submittingPassword = false;
        this.resetPasswordForm();
        this.mostrarCambioPassword = false;
        await this.modalService.confirm({
          title: 'Contraseña actualizada',
          message: 'Tu contraseña se cambió correctamente.',
          confirmText: 'Aceptar'
        });
      },
      error: (err) => {
        this.submittingPassword = false;
        this.toastService.error(err?.error?.message || 'No se pudo cambiar la contraseña. Verifica la contraseña actual.');
      }
    });
  }

  private resetPasswordForm() {
    this.passwordActual = '';
    this.passwordNueva = '';
    this.passwordConfirmacion = '';
    this.submittingPassword = false;
  }
}
