import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent implements OnInit {
  currentStep = 1;
  isProcessingPayment = false;
  reservationCode = '';

  propertyName = 'Cabaña del Río';
  checkIn = '';
  checkOut = '';
  guests = 2;
  pricePerNight = 15000;
  nights = 3;

  // Credit Card form
  cardNumber = '';
  cardExpiry = '';
  cardCVV = '';
  cardHolder = '';
  cardBrand: 'visa' | 'mastercard' | 'amex' | '' = '';

  get cardValid(): boolean {
    return this.cardNumber.replace(/\s/g, '').length >= 15 &&
           this.cardExpiry.length === 5 &&
           this.cardCVV.length >= 3 &&
           this.cardHolder.trim().length >= 3;
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 16) value = value.substring(0, 16);
    // Format with spaces every 4 digits
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.cardNumber = formatted;
    // Detect brand
    if (value.startsWith('4')) this.cardBrand = 'visa';
    else if (value.startsWith('5') || value.startsWith('2')) this.cardBrand = 'mastercard';
    else if (value.startsWith('3')) this.cardBrand = 'amex';
    else this.cardBrand = '';
  }

  formatExpiry(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    if (value.length >= 3) {
      this.cardExpiry = value.substring(0, 2) + '/' + value.substring(2);
    } else {
      this.cardExpiry = value;
    }
  }

  get subtotal(): number {
    return this.pricePerNight * this.nights;
  }

  get serviceFee(): number {
    return Math.round(this.subtotal * 0.08);
  }

  get total(): number {
    return this.subtotal + this.serviceFee;
  }

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;

    this.propertyName = params['propertyName'] || this.propertyName;
    this.guests = params['guests'] ? +params['guests'] : this.guests;
    this.pricePerNight = params['pricePerNight'] ? +params['pricePerNight'] : this.pricePerNight;

    const today = new Date();
    const defaultCheckIn = this.formatDate(today);
    const defaultCheckOut = this.formatDate(new Date(today.getTime() + 3 * 86400000));

    this.checkIn = params['checkIn'] || defaultCheckIn;
    this.checkOut = params['checkOut'] || defaultCheckOut;

    if (params['checkIn'] && params['checkOut']) {
      const d1 = new Date(params['checkIn']);
      const d2 = new Date(params['checkOut']);
      const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
      this.nights = diff > 0 ? diff : this.nights;
    }

    this.reservationCode = this.generateCode();
  }

  goToStep(step: number): void {
    if (step < this.currentStep) {
      this.currentStep = step;
    }
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  simulatePayment(): void {
    this.isProcessingPayment = true;
    setTimeout(() => {
      this.isProcessingPayment = false;
      this.currentStep = 3;
    }, 2000);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDisplayDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'AS-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
