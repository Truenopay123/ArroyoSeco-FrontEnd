import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-cliente-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cliente-register.component.html',
  styleUrls: ['./cliente-register.component.scss']
})
export class ClienteRegisterComponent {
  model = { email: '', password: '', confirm: '' };
  loading = false;
  showPassword = false;
  showConfirm = false;

  constructor(private toast: ToastService, private router: Router, private auth: AuthService) {}

  submit(form: NgForm) {
    if (form.invalid || this.loading) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(this.model.email)) {
      this.toast.show('Correo inválido', 'error');
      return;
    }
    if (this.model.password.length < 6) {
      this.toast.show('Contraseña demasiado corta (mínimo 6 caracteres)', 'error');
      return;
    }
    if (this.model.password !== this.model.confirm) {
      this.toast.show('Las contraseñas no coinciden', 'error');
      return;
    }
    this.loading = true;
    // El backend asigna rol CLIENTE por defecto; no enviamos role
    this.auth.register({ email: this.model.email, password: this.model.password }).pipe(first()).subscribe({
      next: () => {
        this.toast.show('Registro exitoso. Inicia sesión.', 'success');
        this.loading = false;
        this.router.navigate(['/cliente/login']);
      },
      error: () => {
        this.toast.show('No se pudo registrar. Intenta más tarde.', 'error');
        this.loading = false;
      }
    });
  }
}
