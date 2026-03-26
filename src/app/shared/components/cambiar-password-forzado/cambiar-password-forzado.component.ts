import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../services/toast.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-cambiar-password-forzado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cambiar-password-forzado.component.html',
  styleUrls: ['./cambiar-password-forzado.component.scss']
})
export class CambiarPasswordForzadoComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  passwordActual = '';
  passwordNueva = '';
  passwordConfirmacion = '';
  submitting = false;

  cambiarPassword(form: NgForm) {
    if (form.invalid) {
      this.toast.error('Por favor completa todos los campos');
      return;
    }

    if (this.passwordNueva !== this.passwordConfirmacion) {
      this.toast.error('Las contraseñas no coinciden');
      return;
    }

    if (this.passwordNueva.length < 8) {
      this.toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!/[A-Z]/.test(this.passwordNueva)) {
      this.toast.error('La contraseña debe incluir al menos una mayúscula');
      return;
    }

    if (!/[0-9]/.test(this.passwordNueva)) {
      this.toast.error('La contraseña debe incluir al menos un número');
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(this.passwordNueva)) {
      this.toast.error('La contraseña debe incluir al menos un símbolo especial');
      return;
    }

    this.submitting = true;

    this.api.post('/auth/cambiar-password', {
      passwordActual: this.passwordActual,
      passwordNueva: this.passwordNueva
    }).pipe(first()).subscribe({
      next: () => {
        this.toast.success('Contraseña actualizada exitosamente. Por favor, inicia sesión nuevamente.');
        this.submitting = false;
        
        // Cerrar sesión para forzar nuevo login con token actualizado
        this.auth.logout();
        
        // Redirigir al login según el rol
        const roles = this.auth.getRoles();
        if (roles.some(r => /oferente/i.test(r))) {
          setTimeout(() => this.router.navigate(['/oferente/login']), 1500);
        } else if (roles.some(r => /admin/i.test(r))) {
          setTimeout(() => this.router.navigate(['/admin/login']), 1500);
        } else {
          setTimeout(() => this.router.navigate(['/cliente/login']), 1500);
        }
      },
      error: (err) => {
        this.submitting = false;
        this.toast.error(err.error?.message || 'Error al cambiar la contraseña. Verifica tu contraseña actual.');
      }
    });
  }
}
