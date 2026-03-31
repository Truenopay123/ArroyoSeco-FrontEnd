import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmModalService } from '../../../shared/services/confirm-modal.service';
import { first } from 'rxjs/operators';
import * as QRCodeLib from 'qrcode';

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
  qrGenerationFailed = false;
  step: 'loading' | 'setup' | 'verify' | 'enabled' | 'disabled' = 'loading';
  key          = '';
  qrUri        = '';
  codigoTotp   = '';
  twoFaEnabled = false;

  constructor(
    private auth: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private confirmModal: ConfirmModalService
  ) {}

  ngOnInit(): void {
    this.cargarEstado();
  }

  ngAfterViewInit(): void {
    if (this.qrUri) {
      requestAnimationFrame(() => this.generarQR());
    }
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
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.generarQR());
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Error loading 2FA setup:', err);
        this.toast.error('No se pudo cargar la configuración de 2FA');
      }
    });
  }

  private generarQR() {
    if (!this.qrUri) {
      console.warn('QR URI not set');
      return;
    }

    // Ensure canvas is available
    if (!this.qrCanvas?.nativeElement) {
      console.warn('Canvas not available yet, retrying...');
      requestAnimationFrame(() => this.generarQR());
      return;
    }

    const canvas = this.qrCanvas.nativeElement;

    try {
      // Use static import
      QRCodeLib.toCanvas(canvas, this.qrUri, { width: 200, margin: 1 }, (error: any) => {
        if (error) {
          console.error('QR generation error (static import):', error);
          this.qrGenerationFailed = true;
          this.cdr.detectChanges();
        } else {
          console.log('QR generated successfully (static import)');
          this.qrGenerationFailed = false;
          this.cdr.detectChanges();
        }
      });
    } catch (err: any) {
      console.error('QR generation exception (static import):', err);
      this.qrGenerationFailed = true;
      this.cdr.detectChanges();

      // Fallback to dynamic import
      console.log('Attempting dynamic import fallback...');
      import('qrcode').then(QRCode => {
        try {
          QRCode.toCanvas(canvas, this.qrUri, { width: 200, margin: 1 }, (error: any) => {
            if (error) {
              console.error('QR generation error (dynamic import):', error);
              this.qrGenerationFailed = true;
            } else {
              console.log('QR generated successfully (dynamic import)');
              this.qrGenerationFailed = false;
            }
            this.cdr.detectChanges();
          });
        } catch (dynamicErr) {
          console.error('QR dynamic fallback exception:', dynamicErr);
          this.qrGenerationFailed = true;
          this.cdr.detectChanges();
        }
      }).catch(importErr => {
        console.error('QR module import failed:', importErr);
        this.qrGenerationFailed = true;
        this.cdr.detectChanges();
      });
    }
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

  async deshabilitar() {
    const ok = await this.confirmModal.confirm({ title: 'Deshabilitar 2FA', message: '¿Seguro que deseas deshabilitar la autenticación en dos pasos? Tu cuenta será menos segura.', confirmText: 'Deshabilitar', cancelText: 'Cancelar', isDangerous: true });
    if (!ok) return;
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
