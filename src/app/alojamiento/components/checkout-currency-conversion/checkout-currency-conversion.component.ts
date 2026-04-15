import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { NeuronaCambioService } from '../../services/neurona-cambio.service';

@Component({
  selector: 'app-checkout-currency-conversion',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  templateUrl: './checkout-currency-conversion.component.html',
  styleUrl: './checkout-currency-conversion.component.scss'
})
export class CheckoutCurrencyConversionComponent implements OnInit, OnChanges {
  @Input() totalMxn: number = 0;

  private readonly neuronaCambioService = inject(NeuronaCambioService);

  equivalenteUsd: number | null = null;
  tipoCambio: number | null = null;
  loading = false;
  error = '';

  ngOnInit(): void {
    this.calcularEquivalencia();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalMxn'] && !changes['totalMxn'].firstChange) {
      this.calcularEquivalencia();
    }
  }

  private calcularEquivalencia(): void {
    if (this.totalMxn <= 0) {
      this.equivalenteUsd = null;
      this.tipoCambio = null;
      return;
    }

    this.loading = true;
    this.error = '';

    // Usamos un pago arbitrario en USD y pedimos que se convierta
    // La neurona aprenderá el factor correcto
    // Pedimos que el pago en USD sea equivalente al total en MXN
    const estimatedUsd = this.totalMxn / 18; // Estimación inicial ~18 MXN por USD

    this.neuronaCambioService.calcularCambio({
      precioPesosMxn: this.totalMxn,
      pagoDolares: estimatedUsd
    }).subscribe({
      next: (response) => {
        this.loading = false;
        this.equivalenteUsd = response.pagoConvertidoMxn <= this.totalMxn
          ? estimatedUsd
          : estimatedUsd + Math.ceil((response.pagoConvertidoMxn - this.totalMxn) / response.tipoCambio);
        this.tipoCambio = response.tipoCambio;
      },
      error: (err) => {
        this.loading = false;
        // Fallback: usar conversión simple si la neurona no está disponible
        this.equivalenteUsd = parseFloat((this.totalMxn / 18).toFixed(2));
        this.tipoCambio = 18;
      }
    });
  }

  get equivalenteUsdFinal(): number {
    return this.equivalenteUsd ?? (this.totalMxn / (this.tipoCambio || 18));
  }
}
