import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PagoService } from '../../services/pago.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';

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

  constructor(
    private route: ActivatedRoute,
    private pagoService: PagoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const estadoParam = this.route.snapshot.queryParamMap.get('estado') || '';
    const reservaIdParam = parseInt(this.route.snapshot.queryParamMap.get('reservaId') || '0');
    this.reservaId = reservaIdParam;

    if (estadoParam === 'aprobado') this.estado = 'aprobado';
    else if (estadoParam === 'rechazado') this.estado = 'rechazado';
    else if (estadoParam === 'pendiente') this.estado = 'pendiente';
    else this.estado = 'pendiente';

    if (reservaIdParam > 0) {
      this.pagoService.getResultado(reservaIdParam, estadoParam).pipe(first()).subscribe({
        next: (res: any) => {
          this.folio = res?.folio || '';
          this.total = res?.total || 0;
        },
        error: () => {}
      });
    }
  }
}
