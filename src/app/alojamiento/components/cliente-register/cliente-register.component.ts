import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
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
export class ClienteRegisterComponent implements AfterViewInit {
  @ViewChild('qrCanvas') qrCanvas?: ElementRef<HTMLCanvasElement>;

  model = {
    email: '',
    password: '',
    confirm: '',
    // Datos demográficos (opcionales)
    sexo: '',
    fechaNacimiento: '',
    lugarOrigen: ''
  };
  loading        = false;
  verifyingTotp  = false;
  showPassword   = false;
  showConfirm    = false;
  privacyChecked = false;
  step: 'form' | 'totp' = 'form';
  totpSetup = {
    email: '',
    key: '',
    qrUri: '',
    codigo: ''
  };

  readonly sexoOpciones = [
    { value: 'Masculino',          label: 'Masculino' },
    { value: 'Femenino',           label: 'Femenino' },
    { value: 'Otro',               label: 'Otro' },
    { value: 'Prefiero no decir',  label: 'Prefiero no decir' }
  ];

  constructor(
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly auth: AuthService
  ) {}

  ngAfterViewInit(): void {
    if (this.step === 'totp' && this.totpSetup.qrUri) {
      this.generarQR();
    }
  }

  get passwordErrors(): string[] {
    const p = this.model.password;
    const errs: string[] = [];
    if (p.length > 0 && p.length < 8)         errs.push('Mínimo 8 caracteres');
    if (p.length > 0 && !/[A-Z]/.test(p))     errs.push('Al menos una letra mayúscula');
    if (p.length > 0 && !/\d/.test(p))        errs.push('Al menos un número');
    if (p.length > 0 && !/[^a-zA-Z0-9]/.test(p)) errs.push('Al menos un carácter especial (!@#$%...)');
    return errs;
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const errs = this.passwordErrors.length;
    if (errs >= 3) return 'weak';
    if (errs >= 1) return 'medium';
    return this.model.password.length >= 8 ? 'strong' : 'weak';
  }

  submit(form: NgForm) {
    if (form.invalid || this.loading) return;

    if (!this.privacyChecked) {
      this.toast.show('Debes aceptar el aviso de privacidad para continuar.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(this.model.email)) {
      this.toast.show('Correo inválido', 'error');
      return;
    }

    if (this.passwordErrors.length > 0) {
      this.toast.show('La contraseña no cumple con los requisitos de seguridad.', 'error');
      return;
    }

    if (this.model.password !== this.model.confirm) {
      this.toast.show('Las contraseñas no coinciden', 'error');
      return;
    }

    this.loading = true;

    this.auth.register({
      email: this.model.email,
      password: this.model.password,
      sexo: this.model.sexo || undefined,
      fechaNacimiento: this.model.fechaNacimiento || undefined,
      lugarOrigen: this.model.lugarOrigen || undefined,
      aceptaPoliticaDatos: this.privacyChecked
    }).pipe(first()).subscribe({
      next: (res: any) => {
        if (res?.requiresTwoFactorSetup && res?.qrUri && res?.key && res?.email) {
          this.iniciarPasoTotp(res.email, res.key, res.qrUri);
          this.loading = false;
          return;
        }

        // Compatibilidad: algunos backends devuelven token en register y luego
        // el setup TOTP se obtiene en /auth/2fa/setup.
        const legacyToken = res?.token || res?.accessToken || res?.jwt;
        if (legacyToken) {
          this.auth.persistToken(legacyToken);
          this.auth.get2FASetup().pipe(first()).subscribe({
            next: (setup: any) => {
              if (setup?.qrUri && setup?.key) {
                this.iniciarPasoTotp(this.model.email, setup.key, setup.qrUri);
                this.loading = false;
                return;
              }

              this.toast.show(res?.message || 'Registro exitoso. Revisa tu correo para confirmar tu cuenta.', 'success');
              this.loading = false;
              this.router.navigate(['/login']);
            },
            error: () => {
              this.toast.show(res?.message || 'Registro exitoso. Revisa tu correo para confirmar tu cuenta.', 'success');
              this.loading = false;
              this.router.navigate(['/login']);
            }
          });
          return;
        }

        this.toast.show(res?.message || 'Registro exitoso. Revisa tu correo para confirmar tu cuenta.', 'success');
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        const errors: any[] = err?.error?.errors || [];
        if (errors.length > 0) {
          this.toast.show(errors[0]?.description || 'Error al registrar.', 'error');
        } else {
          this.toast.show('No se pudo registrar. Intenta más tarde.', 'error');
        }
        this.loading = false;
      }
    });
  }

  confirmarTotp(form: NgForm) {
    if (form.invalid || this.verifyingTotp) return;
    this.verifyingTotp = true;

    this.auth.enable2FAForRegistration(this.totpSetup.email, this.totpSetup.codigo).pipe(first()).subscribe({
      next: (res: any) => {
        this.verifyingTotp = false;
        this.toast.show(res?.message || '2FA activado correctamente. Ahora confirma tu correo para iniciar sesión.', 'success');
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        this.verifyingTotp = false;
        this.totpSetup.codigo = '';
        this.toast.show(err?.error?.message || 'Código incorrecto. Intenta de nuevo.', 'error');
      }
    });
  }

  private generarQR() {
    if (!this.totpSetup.qrUri || !this.qrCanvas?.nativeElement) return;
    const canvas = this.qrCanvas.nativeElement;

    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvas, this.totpSetup.qrUri, { width: 210, margin: 1 }, (error: any) => {
        if (error) {
          console.error('QR error:', error);
        }
      });
    }).catch(() => {
      // Si la librería no está disponible, el usuario aún puede usar la clave manual.
    });
  }

  private iniciarPasoTotp(email: string, key: string, qrUri: string) {
    this.step = 'totp';
    this.totpSetup = { email, key, qrUri, codigo: '' };
    this.toast.show('Registro creado. Escanea el QR y verifica tu código para activar 2FA.', 'success');
    setTimeout(() => this.generarQR(), 120);
  }
}
