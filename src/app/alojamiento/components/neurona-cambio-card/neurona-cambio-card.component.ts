import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, first } from 'rxjs';
import {
  CalcularCambioResponse,
  NeuronaCambioService,
} from '../../services/neurona-cambio.service';

@Component({
  selector: 'app-neurona-cambio-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './neurona-cambio-card.component.html',
  styleUrl: './neurona-cambio-card.component.scss'
})
export class NeuronaCambioCardComponent {
  private readonly neuronaCambioService = inject(NeuronaCambioService);

  precioPesosMxn: number | null = null;
  pagoDolares: number | null = null;
  resultado: CalcularCambioResponse | null = null;
  loading = false;
  error = '';

  calcularCambio(): void {
    this.error = '';
    this.resultado = null;

    const precioPesosMxn = Number(this.precioPesosMxn);
    const pagoDolares = Number(this.pagoDolares);

    if (!Number.isFinite(precioPesosMxn) || precioPesosMxn <= 0) {
      this.error = 'Ingresa un precio del producto mayor a 0.';
      return;
    }

    if (!Number.isFinite(pagoDolares) || pagoDolares <= 0) {
      this.error = 'Ingresa un pago en USD mayor a 0.';
      return;
    }

    this.loading = true;
    this.neuronaCambioService.calcularCambio({ precioPesosMxn, pagoDolares }).pipe(
      first(),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (response) => {
        this.resultado = response;
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo calcular el cambio con la neurona.';
      }
    });
  }

  get faltanteMxn(): number {
    return this.resultado && this.resultado.cambioMxn < 0
      ? Math.abs(this.resultado.cambioMxn)
      : 0;
  }
}