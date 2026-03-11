import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';

interface Perfil {
  nombre: string;
  correo: string;
  telefono: string;
}

@Component({
  selector: 'app-oferente-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-page">

      <!-- Page header -->
      <div class="page-header">
        <div class="avatar">{{ initials }}</div>
        <div>
          <h2>{{ perfil.nombre || 'Mi Perfil' }}</h2>
          <p class="role-badge">Oferente</p>
        </div>
      </div>

      <!-- Card: Información personal -->
      <section class="config-card">
        <div class="card-header">
          <span class="card-icon">👤</span>
          <div>
            <h3>Información personal</h3>
            <p class="card-desc">Actualiza tu nombre, correo y teléfono de contacto.</p>
          </div>
        </div>

        <form #f="ngForm" (ngSubmit)="guardar(f)" class="fields-grid">
          <div class="field">
            <label for="cfg-nombre">Nombre completo</label>
            <input id="cfg-nombre" type="text" name="nombre" [(ngModel)]="perfil.nombre" required
                   placeholder="Ej: Juan García" autocomplete="name" />
          </div>

          <div class="field">
            <label for="cfg-correo">Correo electrónico</label>
            <input id="cfg-correo" type="email" name="correo" [(ngModel)]="perfil.correo" required
                   placeholder="correo@ejemplo.com" autocomplete="email" />
            <span class="field-hint">Las notificaciones se envían a este correo.</span>
          </div>

          <div class="field">
            <label for="cfg-tel">Teléfono de contacto</label>
            <input id="cfg-tel" type="tel" name="telefono" [(ngModel)]="perfil.telefono"
                   placeholder="Ej: +52 442 123 4567" autocomplete="tel" />
          </div>

          <div class="card-footer">
            <button class="btn primary" type="submit" [disabled]="f.invalid || guardando">
              <span *ngIf="!guardando">💾 Guardar cambios</span>
              <span *ngIf="guardando">Guardando...</span>
            </button>
          </div>
        </form>
      </section>

      <!-- Info panel: notifications -->
      <section class="config-card info-panel">
        <div class="card-header">
          <span class="card-icon">🔔</span>
          <div>
            <h3>Notificaciones</h3>
            <p class="card-desc">Todas las notificaciones del sistema se envían automáticamente por correo electrónico.</p>
          </div>
        </div>
        <div class="info-badge">
          <span class="info-icon">✉️</span>
          <span>Notificaciones activas por <strong>email</strong></span>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .config-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 720px;
    }

    /* Page header */
    .page-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1F7D4D, #52b788);
      color: #fff;
      font-size: 1.4rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(31,125,77,0.3);
    }
    .page-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
    }
    .role-badge {
      margin: 0.2rem 0 0;
      font-size: 0.8rem;
      color: #1F7D4D;
      font-weight: 600;
      background: #e8f5e9;
      border: 1px solid #b8dfcf;
      border-radius: 999px;
      display: inline-block;
      padding: 0.15rem 0.65rem;
    }

    /* Cards */
    .config-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .card-header {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid #f3f4f6;
    }
    .card-icon {
      font-size: 1.5rem;
      width: 42px;
      height: 42px;
      background: #f0fdf4;
      border: 1px solid #d1fae5;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-header h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #1f2937;
    }
    .card-desc {
      margin: 0.2rem 0 0;
      font-size: 0.85rem;
      color: #6b7280;
    }
    .card-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.5rem;
    }

    /* Fields */
    .fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem 1.25rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .field label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #374151;
    }
    .field input {
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      padding: 0.7rem 0.9rem;
      font-size: 0.9rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
      background: #fafafa;
      &:focus {
        border-color: #1F7D4D;
        box-shadow: 0 0 0 3px rgba(31,125,77,0.1);
        background: #fff;
      }
    }
    .field-hint {
      font-size: 0.76rem;
      color: #9ca3af;
    }
    .card-footer { grid-column: span 2; }

    /* Buttons */
    .btn {
      padding: 0.65rem 1.5rem;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn.primary {
      background: linear-gradient(135deg, #1F7D4D, #2d9a61);
      color: #fff;
      box-shadow: 0 3px 10px rgba(31,125,77,0.25);
      &:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(31,125,77,0.3); }
      &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    }

    /* Info panel */
    .info-panel .card-header { margin-bottom: 1rem; padding-bottom: 1rem; }
    .info-badge {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      color: #166534;
    }
    .info-icon { font-size: 1.1rem; }

    @media (max-width: 640px) {
      .fields-grid { grid-template-columns: 1fr; }
      .card-footer { grid-column: auto; }
    }
  `]
})
export class OferenteConfiguracionComponent implements OnInit {
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private modalService = inject(ConfirmModalService);

  guardando = false;

  perfil: Perfil = {
    nombre: '',
    correo: '',
    telefono: '',
  };

  get initials(): string {
    const parts = (this.perfil.nombre || '?').trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0][0] || '?').toUpperCase();
  }

  ngOnInit() {
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.perfil.nombre = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
                            payload['name'] || payload['unique_name'] || '';
        this.perfil.correo = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
                            payload['email'] || '';
      } catch (e) {
        console.error('Error al decodificar token:', e);
      }
    }
  }

  guardar(form: NgForm) {
    if (form.invalid) return;
    this.guardando = true;
    const { nombre, correo, telefono } = this.perfil;
    this.usuarioService.updatePerfil({ nombre, email: correo, telefono }).subscribe({
      next: () => {
        this.guardando = false;
        this.toastService.success('Cambios guardados correctamente');
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error al guardar configuración:', err);
        this.toastService.error('No fue posible guardar los cambios');
      }
    });
  }
}
