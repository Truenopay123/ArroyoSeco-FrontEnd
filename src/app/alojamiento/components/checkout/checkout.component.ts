import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PagoService } from '../../services/pago.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent implements OnInit {
  // Estado de pago real con Mercado Pago
  reservaId           = 0;
  isProcessingPayment = false;
  errorPago           = '';

  // Datos de la reserva (del query param o del API)
  propertyName  = '';
  checkIn       = '';
  checkOut      = '';
  guests        = 1;
  pricePerNight = 0;
  nights        = 1;
  totalAmount   = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pagoService: PagoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;

    this.reservaId    = params['reservaId'] ? +params['reservaId'] : 0;
    this.propertyName = params['propertyName'] || '';
    this.guests       = params['guests']       ? +params['guests']       : 1;
    this.pricePerNight = params['pricePerNight'] ? +params['pricePerNight'] : 0;
    this.checkIn      = params['checkIn']  || '';
    this.checkOut     = params['checkOut'] || '';

    if (this.checkIn && this.checkOut) {
      const d1   = new Date(this.checkIn);
      const d2   = new Date(this.checkOut);
      const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
      this.nights = diff > 0 ? diff : 1;
    }

    this.totalAmount = params['total'] ? +params['total'] : this.pricePerNight * this.nights;
  }

  get subtotal(): number { return this.pricePerNight * this.nights; }
  get serviceFee(): number { return 0; }
  get total(): number { return this.totalAmount || this.subtotal; }

  /** Inicia el pago con Mercado Pago */
  pagarConMercadoPago(): void {
    if (!this.reservaId) {
      this.toast.error('No se encontró información de la reserva.');
      return;
    }

    this.isProcessingPayment = true;
    this.errorPago = '';

    this.pagoService.crearPreferencia(this.reservaId)
      .pipe(first())
      .subscribe({
        next: (res) => {
          this.isProcessingPayment = false;
          // Abrir MP en nueva pestaña para no perder el contexto del sitio.
          const url = res.initPoint || res.sandboxInitPoint;
          if (url) {
            const popup = window.open(url, '_blank', 'noopener,noreferrer');
            if (popup) {
              this.toast.info('Se abrió Mercado Pago en otra pestaña. Aquí verás el estado de tu pago.');
              this.router.navigate(['/cliente/pagos/resultado'], {
                queryParams: {
                  estado: 'pendiente',
                  reservaId: this.reservaId,
                  fromCheckout: 1
                }
              });
            } else {
              // Si el navegador bloquea popups, usar redirección en la misma pestaña.
              window.location.href = url;
            }
          } else {
            this.errorPago = 'No se pudo obtener el enlace de pago.';
          }
        },
        error: (err: any) => {
          this.isProcessingPayment = false;
          this.errorPago = err?.error?.message || 'Error al crear el pago. Intenta de nuevo.';
          this.toast.error(this.errorPago);
        }
      });
  }

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
  }
}
