import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirm-email.component.html',
  styleUrl: './confirm-email.component.scss'
})
export class ConfirmEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  loading = true;
  success = false;
  message = 'Confirmando correo...';

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email') || '';
    const token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!email || !token) {
      this.loading = false;
      this.success = false;
      this.message = 'El enlace de confirmación es inválido.';
      return;
    }

    this.auth.confirmEmail(email, token).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.message = 'Correo confirmado correctamente. Ya puedes iniciar sesión.';
      },
      error: (err) => {
        this.loading = false;
        this.success = false;
        this.message = err?.error?.message || 'No se pudo confirmar el correo.';
      }
    });
  }
}
