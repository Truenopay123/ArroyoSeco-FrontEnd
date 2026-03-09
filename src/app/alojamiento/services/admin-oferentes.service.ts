import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';

export enum TipoOferente {
  Alojamiento = 1,
  Gastronomia = 2,
  Ambos = 3
}

export interface OferenteDto {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  alojamientos?: number;
  numeroAlojamientos?: number;
  estado?: string;
  tipo?: TipoOferente;
}

@Injectable({ providedIn: 'root' })
export class AdminOferentesService {
  private readonly api = inject(ApiService);

  list(tipo?: TipoOferente): Observable<OferenteDto[]> {
    const params = tipo ? `?tipo=${tipo}` : '';
    return this.api.get<OferenteDto[]>(`/Oferentes${params}`);
  }

  listAlojamiento(): Observable<OferenteDto[]> {
    return this.api.get<OferenteDto[]>('/Oferentes/alojamiento');
  }

  listGastronomia(): Observable<OferenteDto[]> {
    return this.api.get<OferenteDto[]>('/Oferentes/gastronomia');
  }

  getById(id: string): Observable<OferenteDto> {
    return this.api.get<OferenteDto>(`/admin/oferentes/${id}`);
  }

  createUsuarioOferente(payload: { email: string; password?: string; nombre?: string; telefono?: string; tipo?: number }): Observable<any> {
    return this.api.post('/admin/oferentes/usuarios', payload);
  }

  update(id: string, payload: Partial<OferenteDto>): Observable<any> {
    return this.api.put(`/admin/oferentes/${id}`, payload);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`/admin/oferentes/${id}`);
  }

  listSolicitudes(): Observable<any[]> {
    return this.api.get<any[]>('/solicitudesoferente?estatus=Pendiente');
  }

  crearSolicitud(payload: { nombreSolicitante: string; telefono: string; mensaje: string; tipoSolicitado: number; correo?: string; nombreNegocio?: string }): Observable<any> {
    // En algunos despliegues el backend espera variaciones del campo correo/email.
    // Mandamos varias claves para maximizar compatibilidad y evitar que se asigne un correo por defecto.
    const extended: any = {
      ...payload,
      email: payload.correo,
      correoSolicitante: payload.correo,
      emailSolicitante: payload.correo
    };
    // Unificamos endpoint a la versión capitalizada usada en otros servicios.
    return this.api.post('/SolicitudesOferente', extended);
  }

  aprobarSolicitud(id: number, tipoOferente?: number): Observable<any> {
    const body = tipoOferente ? { tipoOferente } : {};
    return this.api.post(`/admin/oferentes/solicitudes/${id}/aprobar`, body);
  }

  rechazarSolicitud(id: number): Observable<any> {
    return this.api.post(`/admin/oferentes/solicitudes/${id}/rechazar`, {});
  }

  cambiarTipo(id: string, nuevoTipo: TipoOferente): Observable<any> {
    return this.api.put(`/oferentes/${id}/tipo`, { nuevoTipo });
  }

  cambiarEstado(id: string, estado: string): Observable<any> {
    return this.api.put(`/admin/oferentes/${id}/estado`, { estado });
  }
}
