import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

interface LoginModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {
  loginModel: LoginModel = {
    email: '',
    password: ''
  };

  constructor(private readonly router: Router, private readonly auth: AuthService, private readonly toast: ToastService) {}

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }
    this.auth.login({ email: this.loginModel.email, password: this.loginModel.password }).pipe(first()).subscribe({
      next: () => {
        // Detect role and redirect appropriately
        const roles = this.auth.getRoles();
        if (roles.some(r => /admin/i.test(r))) {
          this.router.navigate(['/admin/home']);
        } else if (roles.some(r => /oferente/i.test(r))) {
          this.router.navigate(['/oferente/home']);
        } else {
          this.router.navigate(['/cliente/home']);
        }
      },
      error: () => this.toast.error('No se pudo iniciar sesión como administrador')
    });
  }
}
