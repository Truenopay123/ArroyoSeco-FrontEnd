import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AlojamientoDto {
  id?: number;
  nombre: string;
  ubicacion: string;
  descripcion?: string;
  latitud?: number | null;
  longitud?: number | null;
  direccion?: string;
  maxHuespedes: number;
  habitaciones: number;
  banos: number;
  precioPorNoche: number;
  fotoPrincipal?: string;
  fotosUrls?: string[];
  amenidades?: string[];
}

@Injectable({ providedIn: 'root' })
export class AlojamientoService {
  private readonly api = inject(ApiService);

  private normalize(item: AlojamientoDto): AlojamientoDto {
    return {
      ...item,
      fotoPrincipal: this.api.toPublicUrl(item.fotoPrincipal),
      fotosUrls: (item.fotosUrls || []).map(url => this.api.toPublicUrl(url) || url)
    };
  }

  listAll(): Observable<AlojamientoDto[]> {
    return this.api.get<AlojamientoDto[]>('/alojamientos').pipe(
      map(items => (items || []).map(item => this.normalize(item)))
    );
  }

  getById(id: number): Observable<AlojamientoDto> {
    return this.api.get<AlojamientoDto>(`/alojamientos/${id}`).pipe(
      map(item => this.normalize(item))
    );
  }

  create(payload: AlojamientoDto): Observable<any> {
    return this.api.post('/alojamientos', payload);
  }

  update(id: number, payload: Partial<AlojamientoDto>): Observable<any> {
    return this.api.put(`/alojamientos/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.api.delete(`/alojamientos/${id}`);
  }

  listMine(): Observable<AlojamientoDto[]> {
    return this.api.get<AlojamientoDto[]>('/alojamientos/mios').pipe(
      map(items => (items || []).map(item => this.normalize(item)))
    );
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<{ url: string }>('/storage/upload?folder=alojamientos', formData).pipe(
      map(res => ({ url: this.api.toPublicUrl(res?.url) || '' }))
    );
  }
}
