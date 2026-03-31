import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PagosGastronomiaService } from '../../services/pagos-gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-checkout-gastronomia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-gastronomia.component.html',
  styleUrl: './checkout-gastronomia.component.scss',
})
export class CheckoutGastronomiaComponent implements OnInit {
  reservaId           = 0;
  isProcessingPayment = false;
  errorPago           = '';

  restaurantName = '';
  fecha          = '';
  personas       = 1;
  totalAmount    = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pagosService: PagosGastronomiaService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    this.reservaId      = params['reservaId']      ? +params['reservaId']      : 0;
    this.restaurantName = params['restaurantName']  || '';
    this.personas       = params['personas']        ? +params['personas']       : 1;
    this.fecha          = params['fecha']           || '';
    this.totalAmount    = params['total']           ? +params['total']          : 0;
  }

  get total(): number { return this.totalAmount; }

  pagarConMercadoPago(): void {
    if (!this.reservaId) {
      this.toast.error('No se encontró información de la reserva.');
      return;
    }

    this.isProcessingPayment = true;
    this.errorPago = '';

    this.pagosService.crearPreferencia(this.reservaId)
      .pipe(first())
      .subscribe({
        next: (res) => {
          this.isProcessingPayment = false;
          const url = res.initPoint || res.sandboxInitPoint;
          if (url) {
            const popup = window.open(url, '_blank', 'noopener,noreferrer');
            if (popup) {
              this.toast.info('Se abrió Mercado Pago en otra pestaña.');
              this.router.navigate(['/cliente/gastronomia/pagos/resultado'], {
                queryParams: {
                  estado: 'pendiente',
                  reservaId: this.reservaId,
                  fromCheckout: 1
                }
              });
            } else {
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
  }
}
