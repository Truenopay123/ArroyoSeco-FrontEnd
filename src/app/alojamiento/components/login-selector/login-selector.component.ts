import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-login-selector',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './login-selector.component.html',
  styleUrl: './login-selector.component.scss'
})
export class LoginSelectorComponent implements OnInit {
  model        = { email: '', password: '' };
  totpModel    = { codigo: '' };
  loading      = false;
  showPassword = false;
  rememberMe   = false;
  step: 'login' | 'totp' = 'login';
  pendingEmail = '';
  private returnUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const ru = this.route.snapshot.queryParamMap.get('returnUrl');
    this.returnUrl = ru && ru.trim().length > 0 ? ru : null;

    if (this.auth.isAuthenticated()) {
      this.redirectByRole();
    }

    // Resume pending 2FA if user refreshes
    const pending = this.auth.getPending2FAEmail();
    if (pending) {
      this.pendingEmail = pending;
      this.step = 'totp';
    }
  }

  submit(form: NgForm) {
    if (form.invalid || this.loading) return;
    this.loading = true;

    this.auth.login({ email: this.model.email, password: this.model.password })
      .pipe(first())
      .subscribe({
        next: (res: any) => {
          this.loading = false;

          if (res?.requiresTwoFactor) {
            // Backend pide código TOTP
            this.pendingEmail = res.email || this.model.email;
            this.step = 'totp';
            this.toast.show('Ingresa el código de tu aplicación autenticadora.', 'info');
            return;
          }

          this.toast.show('Inicio de sesión exitoso', 'success');
          if (this.returnUrl) { this.router.navigateByUrl(this.returnUrl); return; }
          this.redirectByRole();
        },
        error: (err: any) => {
          const requiresConfirmation = !!err?.error?.requiresEmailConfirmation;
          const accountLocked        = !!err?.error?.accountLocked;

          if (accountLocked) {
            this.toast.show(err?.error?.message || 'Cuenta bloqueada temporalmente. Intenta en 15 minutos.', 'error');
          } else if (requiresConfirmation && this.model.email) {
            this.auth.resendConfirmation(this.model.email).pipe(first()).subscribe();
            this.toast.show('Debes confirmar tu correo. Te enviamos un nuevo enlace.', 'warning');
          } else {
            this.toast.show(err?.error?.message || 'Credenciales inválidas', 'error');
          }
          this.loading = false;
        }
      });
  }

  submitTotp(form: NgForm) {
    if (form.invalid || this.loading) return;
    this.loading = true;

    this.auth.verifyTotpLogin(this.pendingEmail, this.totpModel.codigo)
      .pipe(first())
      .subscribe({
        next: () => {
          this.loading = false;
          this.toast.show('Inicio de sesión exitoso', 'success');
          if (this.returnUrl) { this.router.navigateByUrl(this.returnUrl); return; }
          this.redirectByRole();
        },
        error: (err: any) => {
          this.loading = false;
          this.toast.show(err?.error?.message || 'Código TOTP incorrecto', 'error');
          this.totpModel.codigo = '';
        }
      });
  }

  cancelTotp() {
    this.auth.clearPending2FA();
    this.step = 'login';
    this.totpModel.codigo = '';
    this.pendingEmail = '';
    this.model.password = '';
  }

  private redirectByRole() {
    const roles = this.auth.getRoles();
    if (roles.some(r => /admin/i.test(r))) {
      this.router.navigate(['/admin/home']);
    } else if (roles.some(r => /oferente/i.test(r))) {
      this.router.navigate(['/oferente/home']);
    } else {
      this.router.navigate(['/cliente/home']);
    }
  }
}
