import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { forkJoin } from 'rxjs';
import { first } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const FONT_FAMILY = "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif";

Chart.defaults.font.family = FONT_FAMILY;
Chart.defaults.color = '#64748b';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.titleFont = { family: FONT_FAMILY, size: 13, weight: '600' as any };
Chart.defaults.plugins.tooltip.bodyFont = { family: FONT_FAMILY, size: 12, weight: '400' as any };
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.displayColors = true;
Chart.defaults.plugins.tooltip.boxPadding = 4;

@Component({
  selector: 'app-admin-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-estadisticas.component.html',
  styleUrls: ['./admin-estadisticas.component.scss']
})
export class AdminEstadisticasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sexoChart')    sexoCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('edadChart')    edadCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('origenChart')  origenCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reservasChart') reservasCanvas!: ElementRef<HTMLCanvasElement>;

  loading = true;
  resumen: any = {};
  anioActual = new Date().getFullYear();

  private charts: Chart[] = [];

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  private cargar() {
    this.loading = true;
    forkJoin({
      resumen:   this.api.get<any>('/estadisticas/resumen'),
      sexo:      this.api.get<any[]>('/estadisticas/por-sexo'),
      edad:      this.api.get<any[]>('/estadisticas/por-edad'),
      origen:    this.api.get<any[]>('/estadisticas/por-origen'),
      reservas:  this.api.get<any[]>(`/estadisticas/reservas-por-mes?anio=${this.anioActual}`),
      ratings:   this.api.get<any[]>('/estadisticas/rating-alojamientos')
    }).pipe(first()).subscribe({
      next: (data) => {
        this.resumen = data.resumen;
        this.loading = false;
        setTimeout(() => {
          this.renderSexoChart(data.sexo);
          this.renderEdadChart(data.edad);
          this.renderOrigenChart(data.origen);
          this.renderReservasChart(data.reservas);
        }, 100);
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al cargar estadísticas');
      }
    });
  }

  private renderSexoChart(data: any[]) {
    if (!data?.length || !this.sexoCanvas?.nativeElement) return;
    const colors = ['#3b82f6', '#f43f5e', '#10b981', '#a78bfa', '#f59e0b'];
    const chart = new Chart(this.sexoCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.categoria),
        datasets: [{
          data: data.map(d => d.cantidad),
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        animation: { animateRotate: true, duration: 800 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { size: 12, weight: '500' as any }
            }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private renderEdadChart(data: any[]) {
    if (!data?.length || !this.edadCanvas?.nativeElement) return;
    const ctx = this.edadCanvas.nativeElement.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.85)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.25)');
    const chart = new Chart(this.edadCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(d => d.categoria),
        datasets: [{
          label: 'Visitantes',
          data: data.map(d => d.cantidad),
          backgroundColor: gradient,
          hoverBackgroundColor: '#2563eb',
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.04)' },
            border: { display: false }
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private renderOrigenChart(data: any[]) {
    if (!data?.length || !this.origenCanvas?.nativeElement) return;
    const ctx = this.origenCanvas.nativeElement.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 600, 0);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.85)');
    const chart = new Chart(this.origenCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(d => d.ciudad),
        datasets: [{
          label: 'Visitantes',
          data: data.map(d => d.cantidad),
          backgroundColor: gradient,
          hoverBackgroundColor: '#059669',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.65,
          categoryPercentage: 0.8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.04)' },
            border: { display: false }
          },
          y: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private renderReservasChart(data: any[]) {
    if (!data?.length || !this.reservasCanvas?.nativeElement) return;
    const ctx = this.reservasCanvas.nativeElement.getContext('2d')!;

    const blueGrad = ctx.createLinearGradient(0, 0, 0, 320);
    blueGrad.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    blueGrad.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    const orangeGrad = ctx.createLinearGradient(0, 0, 0, 320);
    orangeGrad.addColorStop(0, 'rgba(249, 115, 22, 0.2)');
    orangeGrad.addColorStop(1, 'rgba(249, 115, 22, 0.01)');

    const chart = new Chart(this.reservasCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: data.map(d => d.mesNombre),
        datasets: [
          {
            label: 'Reservas',
            data: data.map(d => d.cantidad),
            borderColor: '#3b82f6',
            backgroundColor: blueGrad,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#3b82f6',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#3b82f6',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          },
          {
            label: 'Ingresos ($)',
            data: data.map(d => d.ingresos),
            borderColor: '#f97316',
            backgroundColor: orangeGrad,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#f97316',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#f97316',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { size: 12, weight: '500' as any }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.04)' },
            border: { display: false }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            ticks: { font: { size: 11 } },
            grid: { drawOnChartArea: false },
            border: { display: false }
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
    this.charts.push(chart);
  }
}
