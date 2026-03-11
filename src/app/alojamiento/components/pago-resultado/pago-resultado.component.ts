import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PagoService } from '../../services/pago.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-pago-resultado',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pago-resultado.component.html',
  styleUrls: ['./pago-resultado.component.scss']
})
export class PagoResultadoComponent implements OnInit {
  estado: 'aprobado' | 'rechazado' | 'pendiente' | 'loading' = 'loading';
  reservaId = 0;
  folio     = '';
  total     = 0;
  private pollSub?: Subscription;
  private approvalNotified = false;

  constructor(
    private route: ActivatedRoute,
    private pagoService: PagoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const estadoParam = this.route.snapshot.queryParamMap.get('estado')
      || this.route.snapshot.queryParamMap.get('status')
      || this.route.snapshot.queryParamMap.get('collection_status')
      || '';
    const fromCheckout = this.route.snapshot.queryParamMap.get('fromCheckout') === '1';
    const reservaIdParam = parseInt(this.route.snapshot.queryParamMap.get('reservaId') || '0');
    this.reservaId = reservaIdParam;

    const estadoNorm = estadoParam.toLowerCase();
    if (/aprob|approved/.test(estadoNorm)) this.estado = 'aprobado';
    else if (/rechaz|rejected|cancel/.test(estadoNorm)) this.estado = 'rechazado';
    else if (/pend|in_process|pending/.test(estadoNorm)) this.estado = 'pendiente';
    else this.estado = 'pendiente';

    if (reservaIdParam > 0) {
      this.pagoService.getResultado(reservaIdParam, estadoParam).pipe(first()).subscribe({
        next: (res: any) => {
          this.folio = res?.folio || '';
          this.total = res?.total || 0;

          const pagoEstado = String(res?.pagoEstado || '').toLowerCase();
          if (/aprob/.test(pagoEstado)) this.estado = 'aprobado';
          else if (/rechaz|cancel/.test(pagoEstado)) this.estado = 'rechazado';
        },
        error: () => {}
      });

      if (fromCheckout || this.estado === 'pendiente') {
        this.startPollingEstadoPago();
      }
    }

    if (this.estado === 'aprobado') {
      this.toast.success('Pago confirmado. Tu reserva está activa.');
      this.approvalNotified = true;
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  private startPollingEstadoPago() {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(4000).subscribe(() => {
      if (!this.reservaId) return;
      this.pagoService.getComprobanteReserva(this.reservaId).pipe(first()).subscribe({
        next: (res: any) => {
          const estadoPago = String(res?.estado || '').toLowerCase();
          if (/aprob/.test(estadoPago)) {
            this.estado = 'aprobado';
            if (!this.approvalNotified) {
              this.toast.success('Pago confirmado. Tu reserva está activa.');
              this.approvalNotified = true;
            }
            this.pollSub?.unsubscribe();
          } else if (/rechaz|cancel/.test(estadoPago)) {
            this.estado = 'rechazado';
            this.pollSub?.unsubscribe();
          } else {
            this.estado = 'pendiente';
          }
        },
        error: () => {}
      });
    });
  }
}
