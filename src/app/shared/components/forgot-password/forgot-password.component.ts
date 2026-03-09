import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  email = '';
  loading = false;
  done = false;

  submit(form: NgForm): void {
    if (form.invalid || this.loading) return;
    this.loading = true;
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.done = true;
      },
      error: () => {
        this.loading = false;
        this.done = true;
      }
    });
  }
}
