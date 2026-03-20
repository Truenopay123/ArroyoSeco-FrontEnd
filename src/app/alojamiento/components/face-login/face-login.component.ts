import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FaceAuthService } from '../../../core/services/face-auth.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

/**
 * Componente de verificación facial durante el login.
 * Recibe tempToken y faceDescriptor via queryParams o state del router.
 * Abre la webcam, compara localmente y si coincide, envía el tempToken al backend.
 */
@Component({
  selector: 'app-face-login',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule, MatIconModule],
  templateUrl: './face-login.component.html',
  styleUrls: ['./face-login.component.scss']
})
export class FaceLoginComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  // Estado del componente
  estado: 'cargando' | 'listo' | 'comparando' | 'exito' | 'error' = 'cargando';
  mensaje = 'Cargando modelos de reconocimiento facial…';
  intentos = 0;
  readonly maxIntentos = 5;

  private tempToken = '';
  private storedDescriptor: Float32Array | null = null;
  private stream: MediaStream | null = null;
  private returnUrl: string | null = null;

  constructor(
    private faceAuth: FaceAuthService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    // Recuperar datos del state del router
    const nav = this.router.getCurrentNavigation()?.extras?.state
      ?? history.state;

    this.tempToken = nav?.['tempToken'] ?? '';
    const descriptorJson = nav?.['faceDescriptor'] ?? '';
    this.returnUrl = nav?.['returnUrl'] ?? null;

    if (!this.tempToken || !descriptorJson) {
      this.toast.show('Datos de verificación facial no disponibles.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    // Parsear descriptor almacenado
    try {
      const arr: number[] = typeof descriptorJson === 'string'
        ? JSON.parse(descriptorJson)
        : descriptorJson;
      this.storedDescriptor = new Float32Array(arr);
    } catch {
      this.toast.show('Error al procesar descriptor facial.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    // Cargar modelos de face-api.js
    try {
      await this.faceAuth.loadModels();
    } catch {
      this.estado = 'error';
      this.mensaje = 'No se pudieron cargar los modelos de reconocimiento facial.';
      return;
    }

    // Iniciar webcam
    await this.iniciarCamara();
  }

  ngOnDestroy() {
    this.detenerCamara();
  }

  /** Inicia la cámara frontal del dispositivo */
  private async iniciarCamara() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 360 }
      });
      // Esperar a que el ViewChild esté disponible
      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = this.stream;
        }
        this.estado = 'listo';
        this.mensaje = 'Coloca tu rostro frente a la cámara y presiona "Verificar".';
      }, 100);
    } catch {
      this.estado = 'error';
      this.mensaje = 'No se pudo acceder a la cámara. Verifica los permisos del navegador.';
    }
  }

  /** Detiene la cámara y libera recursos */
  private detenerCamara() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  /** Captura el rostro y lo compara con el descriptor almacenado */
  async verificar() {
    if (!this.videoRef?.nativeElement || !this.storedDescriptor) return;

    this.estado = 'comparando';
    this.mensaje = 'Analizando rostro…';
    this.intentos++;

    const descriptor = await this.faceAuth.getDescriptor(this.videoRef.nativeElement);

    if (!descriptor) {
      if (this.intentos >= this.maxIntentos) {
        this.estado = 'error';
        this.mensaje = 'Se agotaron los intentos. Redirigiendo al login…';
        this.detenerCamara();
        setTimeout(() => this.router.navigate(['/login']), 2000);
        return;
      }
      this.estado = 'listo';
      this.mensaje = `No se detectó un rostro. Intento ${this.intentos}/${this.maxIntentos}.`;
      return;
    }

    // Comparación local con face-api.js
    const coincide = this.faceAuth.comparar(descriptor, this.storedDescriptor);

    if (!coincide) {
      if (this.intentos >= this.maxIntentos) {
        this.estado = 'error';
        this.mensaje = 'Rostro no coincide tras varios intentos. Redirigiendo al login…';
        this.detenerCamara();
        setTimeout(() => this.router.navigate(['/login']), 2000);
        return;
      }
      this.estado = 'listo';
      this.mensaje = `Rostro no coincide. Intento ${this.intentos}/${this.maxIntentos}. Inténtalo de nuevo.`;
      return;
    }

    // Coincidencia — enviar tempToken al backend para obtener JWT real
    this.mensaje = 'Rostro verificado. Obteniendo sesión…';
    this.faceAuth.verify(this.tempToken).pipe(first()).subscribe({
      next: (res) => {
        this.auth.persistToken(res.token);
        this.estado = 'exito';
        this.mensaje = '¡Verificación exitosa!';
        this.detenerCamara();
        this.toast.show('Inicio de sesión exitoso', 'success');

        setTimeout(() => {
          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.redirigirPorRol();
          }
        }, 800);
      },
      error: () => {
        this.estado = 'error';
        this.mensaje = 'El token temporal expiró o es inválido. Inicia sesión de nuevo.';
        this.detenerCamara();
        setTimeout(() => this.router.navigate(['/login']), 2500);
      }
    });
  }

  /** Cancela y regresa al formulario de login */
  cancelar() {
    this.detenerCamara();
    this.router.navigate(['/login']);
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
