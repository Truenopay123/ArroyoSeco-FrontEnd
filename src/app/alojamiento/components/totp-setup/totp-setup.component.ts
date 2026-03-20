import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

// qrcode importado dinámicamente para evitar errores SSR
declare const QRCode: any;

@Component({
  selector: 'app-totp-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './totp-setup.component.html',
  styleUrls: ['./totp-setup.component.scss']
})
export class TotpSetupComponent implements OnInit, AfterViewInit {
  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  loading      = false;
  verifying    = false;
  step: 'loading' | 'setup' | 'verify' | 'enabled' | 'disabled' = 'loading';
  key          = '';
  qrUri        = '';
  codigoTotp   = '';
  twoFaEnabled = false;

  constructor(private auth: AuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.cargarEstado();
  }

  ngAfterViewInit(): void {
    if (this.qrUri) this.generarQR();
  }

  private cargarEstado() {
    this.loading = true;
    this.auth.get2FASetup().pipe(first()).subscribe({
      next: (res: any) => {
        this.loading      = false;
        this.key          = res.key;
        this.qrUri        = res.qrUri;
        this.twoFaEnabled = res.habilitado;
        this.step         = res.habilitado ? 'enabled' : 'setup';
        setTimeout(() => this.generarQR(), 100);
      },
      error: () => {
        this.loading = false;
        this.toast.error('No se pudo cargar la configuración de 2FA');
      }
    });
  }

  private generarQR() {
    if (!this.qrUri || !this.qrCanvas?.nativeElement) return;
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(this.qrCanvas.nativeElement, this.qrUri, { width: 200, margin: 1 }, (error: any) => {
        if (error) console.error('QR error:', error);
      });
    }).catch(() => {
      // qrcode not available - show URI manually
    });
  }

  habilitar(form: NgForm) {
    if (form.invalid || this.verifying) return;
    this.verifying = true;
    this.auth.enable2FA(this.codigoTotp).pipe(first()).subscribe({
      next: () => {
        this.verifying    = false;
        this.twoFaEnabled = true;
        this.step         = 'enabled';
        this.toast.success('Autenticación en dos pasos habilitada.');
        this.codigoTotp   = '';
      },
      error: (err: any) => {
        this.verifying  = false;
        this.toast.error(err?.error?.message || 'Código incorrecto. Intenta de nuevo.');
        this.codigoTotp = '';
      }
    });
  }

  deshabilitar() {
    if (!confirm('¿Seguro que deseas deshabilitar la autenticación en dos pasos? Tu cuenta será menos segura.')) return;
    this.verifying = true;
    this.auth.disable2FA().pipe(first()).subscribe({
      next: () => {
        this.verifying    = false;
        this.twoFaEnabled = false;
        this.step         = 'setup';
        this.toast.success('2FA deshabilitado.');
        this.cargarEstado(); // Refresh to get new key
      },
      error: () => {
        this.verifying = false;
        this.toast.error('No se pudo deshabilitar 2FA.');
      }
    });
  }
}
