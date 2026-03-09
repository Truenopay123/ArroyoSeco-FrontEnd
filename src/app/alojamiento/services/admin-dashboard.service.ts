import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface AdminRecentActivityDto {
  date: string;
  text: string;
  type: 'oferente' | 'reserva' | 'notificacion' | 'solicitud';
}

export interface AdminDashboardSummaryDto {
  oferentesActivos: number;
  reservasMes: number;
  ingresosMes: number;
  solicitudesPendientes: number;
  recentActivity: AdminRecentActivityDto[];
}

export interface EstadisticaItemDto {
  categoria?: string;
  ciudad?: string;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly api = inject(ApiService);

  getResumen(): Observable<AdminDashboardSummaryDto> {
    return this.api.get<AdminDashboardSummaryDto>('/admin/dashboard/resumen');
  }

  getTurismoResumen(): Observable<any> {
    return this.api.get('/estadisticas/resumen');
  }

  getTurismoPorSexo(): Observable<EstadisticaItemDto[]> {
    return this.api.get<EstadisticaItemDto[]>('/estadisticas/por-sexo');
  }

  getTurismoPorEdad(): Observable<EstadisticaItemDto[]> {
    return this.api.get<EstadisticaItemDto[]>('/estadisticas/por-edad');
  }

  getTurismoPorOrigen(): Observable<EstadisticaItemDto[]> {
    return this.api.get<EstadisticaItemDto[]>('/estadisticas/por-origen');
  }
}
