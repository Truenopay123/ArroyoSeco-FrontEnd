import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { forkJoin } from 'rxjs';
import { first } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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
    const chart = new Chart(this.sexoCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.categoria),
        datasets: [{ data: data.map(d => d.cantidad),
          backgroundColor: ['#4f8ef7','#f27a4a','#54c9a8','#b5b5b5'] }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
    this.charts.push(chart);
  }

  private renderEdadChart(data: any[]) {
    if (!data?.length || !this.edadCanvas?.nativeElement) return;
    const chart = new Chart(this.edadCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(d => d.categoria),
        datasets: [{ label: 'Visitantes', data: data.map(d => d.cantidad),
          backgroundColor: '#4f8ef7', borderRadius: 6 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
    this.charts.push(chart);
  }

  private renderOrigenChart(data: any[]) {
    if (!data?.length || !this.origenCanvas?.nativeElement) return;
    const chart = new Chart(this.origenCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(d => d.ciudad),
        datasets: [{ label: 'Visitantes', data: data.map(d => d.cantidad),
          backgroundColor: '#54c9a8', borderRadius: 6 }]
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
    });
    this.charts.push(chart);
  }

  private renderReservasChart(data: any[]) {
    if (!data?.length || !this.reservasCanvas?.nativeElement) return;
    const chart = new Chart(this.reservasCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: data.map(d => d.mesNombre),
        datasets: [
          { label: 'Reservas', data: data.map(d => d.cantidad),
            borderColor: '#4f8ef7', backgroundColor: 'rgba(79,142,247,0.1)', tension: 0.4, fill: true },
          { label: 'Ingresos ($)', data: data.map(d => d.ingresos),
            borderColor: '#f27a4a', backgroundColor: 'rgba(242,122,74,0.1)', tension: 0.4, fill: true,
            yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y:  { beginAtZero: true, ticks: { stepSize: 1 } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
        }
      }
    });
    this.charts.push(chart);
  }
}
