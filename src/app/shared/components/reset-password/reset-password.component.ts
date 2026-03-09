import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  token = '';
  passwordNueva = '';
  confirm = '';
  loading = false;
  done = false;
  error = '';

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.email || !this.token) {
      this.error = 'Enlace inválido.';
    }
  }

  submit(form: NgForm): void {
    if (form.invalid || this.loading || this.error) return;
    if (this.passwordNueva !== this.confirm) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    this.auth.resetPassword({ email: this.email, token: this.token, passwordNueva: this.passwordNueva }).subscribe({
      next: () => {
        this.loading = false;
        this.done = true;
        setTimeout(() => this.router.navigateByUrl('/login'), 1200);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'No se pudo restablecer la contraseña.';
      }
    });
  }
}
