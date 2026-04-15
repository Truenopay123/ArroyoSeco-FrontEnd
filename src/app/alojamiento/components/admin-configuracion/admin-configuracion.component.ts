import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { FaceAuthService } from '../../../core/services/face-auth.service';
import { first } from 'rxjs/operators';

interface Perfil {
  nombre: string;
  correo: string;
}

@Component({
  selector: 'app-admin-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-page">

      <!-- Page header -->
      <div class="page-header">
        <div class="avatar">{{ initials }}</div>
        <div>
          <h2>{{ perfil.nombre || 'Mi Perfil' }}</h2>
          <p class="role-badge">Administrador</p>
        </div>
      </div>

      <!-- Card: Información personal -->
      <section class="config-card">
        <div class="card-header">
          <span class="card-icon">👤</span>
          <div>
            <h3>Información personal</h3>
            <p class="card-desc">Tu información como administrador del sistema.</p>
          </div>
        </div>

        <div class="fields-grid readonly-grid">
          <div class="field">
            <label>Nombre</label>
            <span class="field-value">{{ perfil.nombre || '—' }}</span>
          </div>
          <div class="field">
            <label>Correo electrónico</label>
            <span class="field-value">{{ perfil.correo || '—' }}</span>
          </div>
        </div>
      </section>

      <!-- Card: Gestión de rostro -->
      <section class="config-card">
        <div class="card-header">
          <span class="card-icon">🔐</span>
          <div>
            <h3>Verificación Facial</h3>
            <p class="card-desc">Administra tu rostro registrado para la verificación de identidad al iniciar sesión.</p>
          </div>
        </div>

        <!-- Estado de carga -->
        <div class="face-status-row" *ngIf="faceLoading">
          <span class="face-status-icon">⏳</span>
          <span class="face-status-text">Consultando estado facial…</span>
        </div>

        <!-- Rostro registrado -->
        <div *ngIf="!faceLoading && faceEnrolled && faceEstado === 'idle'">
          <div class="face-status-row enrolled">
            <span class="face-status-icon">✅</span>
            <span class="face-status-text">Rostro registrado correctamente.</span>
          </div>
          <div class="face-actions">
            <button class="btn secondary" (click)="iniciarCambioRostro()" [disabled]="faceProcessing">
              🔄 Cambiar rostro
            </button>
            <button class="btn danger-outline" (click)="eliminarRostro()" [disabled]="faceProcessing">
              🗑️ Eliminar rostro
            </button>
          </div>
        </div>

        <!-- Sin rostro registrado -->
        <div *ngIf="!faceLoading && !faceEnrolled && faceEstado === 'idle'">
          <div class="face-status-row not-enrolled">
            <span class="face-status-icon">⚠️</span>
            <span class="face-status-text">No tienes un rostro registrado.</span>
          </div>
          <div class="face-actions">
            <button class="btn primary" (click)="iniciarCambioRostro()" [disabled]="faceProcessing">
              📷 Registrar rostro
            </button>
          </div>
        </div>

        <!-- Cámara activa para captura -->
        <div *ngIf="faceEstado === 'camara' || faceEstado === 'capturando'" class="face-capture-area">
          <p class="face-instruccion">Coloca tu rostro frente a la cámara y presiona "Capturar".</p>
          <div class="face-video-wrapper">
            <video #faceVideo autoplay playsinline muted class="face-webcam-video"></video>
            <div class="face-video-overlay" *ngIf="faceEstado === 'capturando'">
              <span class="face-spinner"></span>
              <span>Analizando rostro…</span>
            </div>
          </div>
          <div class="face-actions">
            <button class="btn primary" (click)="capturarNuevoRostro()" [disabled]="faceEstado === 'capturando'">
              📸 Capturar
            </button>
            <button class="btn secondary" (click)="cancelarCaptura()" [disabled]="faceEstado === 'capturando'">
              Cancelar
            </button>
          </div>
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
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e3a5f, #2c5f8a);
      color: #fff;
      font-size: 1.4rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(30,58,95,0.3);
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
      color: #1e3a5f;
      font-weight: 600;
      background: #e0ecf8;
      border: 1px solid #b3cde0;
      border-radius: 999px;
      display: inline-block;
      padding: 0.15rem 0.65rem;
    }

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
      background: #f0f4f8;
      border: 1px solid #d0dbe8;
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
    .field-value {
      font-size: 0.9rem;
      color: #1f2937;
      padding: 0.7rem 0.9rem;
      background: #f9fafb;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
    }

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
      background: linear-gradient(135deg, #1e3a5f, #2c5f8a);
      color: #fff;
      box-shadow: 0 3px 10px rgba(30,58,95,0.25);
      &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(30,58,95,0.3); }
      &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    }
    .btn.secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1.5px solid #e5e7eb;
      &:hover:not(:disabled) { background: #e5e7eb; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .btn.danger-outline {
      background: transparent;
      color: #dc2626;
      border: 1.5px solid #fca5a5;
      &:hover:not(:disabled) { background: #fef2f2; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    /* Face management */
    .face-status-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-size: 0.9rem;
    }
    .face-status-row.enrolled { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .face-status-row.not-enrolled { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .face-status-icon { font-size: 1.2rem; flex-shrink: 0; }
    .face-status-text { font-weight: 500; }
    .face-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    .face-capture-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .face-instruccion {
      font-size: 0.88rem;
      color: #6b7280;
      text-align: center;
      margin: 0;
    }
    .face-video-wrapper {
      position: relative;
      width: 100%;
      max-width: 320px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid #d0dbe8;
    }
    .face-webcam-video {
      width: 100%;
      display: block;
      border-radius: 12px;
      background: #000;
    }
    .face-video-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: rgba(0,0,0,0.5);
      color: #fff;
      font-size: 0.85rem;
    }
    .face-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .fields-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminConfiguracionComponent implements OnInit, OnDestroy {
  @ViewChild('faceVideo') faceVideoRef!: ElementRef<HTMLVideoElement>;

  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private faceAuth = inject(FaceAuthService);

  perfil: Perfil = { nombre: '', correo: '' };

  // Face management state
  faceLoading = true;
  faceEnrolled = false;
  faceEstado: 'idle' | 'camara' | 'capturando' = 'idle';
  faceProcessing = false;
  private faceStream: MediaStream | null = null;

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
    this.cargarEstadoFacial();
  }

  ngOnDestroy() {
    this.detenerCamaraFace();
  }

  // ── Face management ──────────────────────────────────────────────────

  private cargarEstadoFacial() {
    this.faceLoading = true;
    this.faceAuth.getStatus().pipe(first()).subscribe({
      next: (res) => {
        this.faceEnrolled = res.hasFaceEnrolled;
        this.faceLoading = false;
      },
      error: () => {
        this.faceLoading = false;
      }
    });
  }

  async iniciarCambioRostro() {
    this.faceProcessing = true;

    if (this.faceEnrolled) {
      try {
        await this.faceAuth.unenroll().pipe(first()).toPromise();
        this.faceEnrolled = false;
      } catch {
        this.toastService.error('No se pudo eliminar el rostro anterior.');
        this.faceProcessing = false;
        return;
      }
    }

    try {
      await this.faceAuth.loadModels();
    } catch {
      this.toastService.error('No se pudieron cargar los modelos faciales.');
      this.faceProcessing = false;
      return;
    }

    try {
      this.faceStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 360 }
      });
      this.faceEstado = 'camara';
      this.faceProcessing = false;
      setTimeout(() => {
        if (this.faceVideoRef?.nativeElement) {
          this.faceVideoRef.nativeElement.srcObject = this.faceStream;
        }
      }, 100);
    } catch {
      this.toastService.error('No se pudo acceder a la cámara.');
      this.faceProcessing = false;
    }
  }

  async capturarNuevoRostro() {
    if (!this.faceVideoRef?.nativeElement) return;

    this.faceEstado = 'capturando';
    const descriptor = await this.faceAuth.getDescriptor(this.faceVideoRef.nativeElement);

    if (!descriptor) {
      this.faceEstado = 'camara';
      this.toastService.error('No se detectó un rostro. Asegúrate de tener buena iluminación.');
      return;
    }

    const descriptorArray = Array.from(descriptor);
    this.faceAuth.enroll(descriptorArray).pipe(first()).subscribe({
      next: () => {
        this.faceEnrolled = true;
        this.faceEstado = 'idle';
        this.detenerCamaraFace();
        this.toastService.success('Rostro registrado exitosamente.');
      },
      error: (err) => {
        this.faceEstado = 'camara';
        const msg = err?.error?.message || 'Error al registrar el rostro.';
        this.toastService.error(msg);
      }
    });
  }

  eliminarRostro() {
    this.faceProcessing = true;
    this.faceAuth.unenroll().pipe(first()).subscribe({
      next: () => {
        this.faceEnrolled = false;
        this.faceProcessing = false;
        this.toastService.success('Rostro eliminado correctamente.');
      },
      error: () => {
        this.faceProcessing = false;
        this.toastService.error('No se pudo eliminar el rostro.');
      }
    });
  }

  cancelarCaptura() {
    this.detenerCamaraFace();
    this.faceEstado = 'idle';
    this.cargarEstadoFacial();
  }

  private detenerCamaraFace() {
    this.faceStream?.getTracks().forEach(t => t.stop());
    this.faceStream = null;
  }
}
