import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FaceAuthService } from '../../../core/services/face-auth.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

/**
 * Componente para registrar rostro durante el flujo de login.
 * Recibe tempToken via router state. Si no tiene tempToken, redirige a /login.
 */
@Component({
  selector: 'app-face-enroll',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule, MatIconModule],
  templateUrl: './face-enroll.component.html',
  styleUrls: ['./face-enroll.component.scss']
})
export class FaceEnrollComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  estado: 'cargando' | 'camara' | 'capturando' | 'registrado' | 'error' = 'cargando';
  mensaje = 'Cargando modelos de reconocimiento facial…';
  private stream: MediaStream | null = null;
  private tempToken = '';
  private returnUrl: string | null = null;

  constructor(
    private faceAuth: FaceAuthService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    // Recuperar datos del state del router
    const nav = this.router.getCurrentNavigation()?.extras?.state ?? history.state;
    this.tempToken = nav?.['tempToken'] ?? '';
    this.returnUrl = nav?.['returnUrl'] ?? null;
    const isLoginFlow = nav?.['loginFlow'] === true;

    // Si no viene del login, redirigir
    if (!this.tempToken || !isLoginFlow) {
      this.router.navigate(['/login']);
      return;
    }

    // Cargar modelos y abrir cámara automáticamente
    try {
      await this.faceAuth.loadModels();
    } catch {
      this.estado = 'error';
      this.mensaje = 'No se pudieron cargar los modelos de reconocimiento facial.';
      return;
    }

    await this.iniciarCamara();
  }

  ngOnDestroy() {
    this.detenerCamara();
  }

  private async iniciarCamara() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 360 }
      });
      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = this.stream;
        }
        this.estado = 'camara';
        this.mensaje = 'Coloca tu rostro frente a la cámara y presiona "Registrar Rostro".';
      }, 100);
    } catch {
      this.estado = 'error';
      this.mensaje = 'No se pudo acceder a la cámara. Verifica los permisos del navegador.';
    }
  }

  /** Captura el descriptor y lo envía al backend con el tempToken */
  async capturar() {
    if (!this.videoRef?.nativeElement) return;

    this.estado = 'capturando';
    this.mensaje = 'Analizando rostro…';

    const descriptor = await this.faceAuth.getDescriptor(this.videoRef.nativeElement);

    if (!descriptor) {
      this.estado = 'camara';
      this.mensaje = 'No se detectó un rostro. Asegúrate de tener buena iluminación e inténtalo de nuevo.';
      return;
    }

    // Enviar al backend con tempToken → guarda rostro + devuelve JWT
    const descriptorArray = Array.from(descriptor);
    this.faceAuth.enrollInitial(this.tempToken, descriptorArray).pipe(first()).subscribe({
      next: (res) => {
        this.auth.persistToken(res.token);
        this.estado = 'registrado';
        this.mensaje = '¡Rostro registrado exitosamente!';
        this.detenerCamara();
        this.toast.show('Rostro registrado. Sesión iniciada.', 'success');

        // Redirigir después de un breve delay
        setTimeout(() => {
          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.redirigirPorRol();
          }
        }, 1200);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al registrar el rostro.';
        if (msg.includes('expirado') || msg.includes('inválido')) {
          this.estado = 'error';
          this.mensaje = 'Token expirado. Vuelve a iniciar sesión.';
          this.detenerCamara();
          setTimeout(() => this.router.navigate(['/login']), 2500);
        } else {
          this.estado = 'camara';
          this.mensaje = msg + ' Inténtalo de nuevo.';
        }
        this.toast.show(msg, 'error');
      }
    });
  }

  /** Cancela y regresa al login */
  cancelar() {
    this.detenerCamara();
    this.router.navigate(['/login']);
  }

  private detenerCamara() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  private redirigirPorRol() {
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
