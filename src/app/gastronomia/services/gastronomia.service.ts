import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// ===== Interfaces =====
export interface FotoEstablecimientoDto {
  id?: number;
  establecimientoId?: number;
  url: string;
  orden: number;
}

export interface EstablecimientoDto {
  id?: number;
  oferenteId?: string;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  fotoPrincipal?: string;
  fotosUrls?: string[];
  fotos?: FotoEstablecimientoDto[];
  estado?: string;
  direccion?: string;
  latitud?: number | null;
  longitud?: number | null;
  menus?: MenuDto[];
  mesas?: MesaDto[];
}

export interface MenuDto {
  id?: number;
  establecimientoId?: number;
  nombre: string;
  items?: MenuItemDto[];
}

export interface MenuItemDto {
  id?: number;
  menuId?: number;
  nombre: string;
  descripcion: string;
  precio: number;
}

export interface MesaDto {
  id?: number;
  establecimientoId?: number;
  numero: number;
  capacidad: number;
  disponible?: boolean;
}

export interface ReservaGastronomiaDto {
  id?: number;
  usuarioId?: string;
  establecimientoId?: number;
  mesaId?: number;
  fecha: string; // ISO string
  numeroPersonas: number;
  estado?: string;
  total?: number;
  establecimientoNombre?: string;
  clienteNombre?: string;
  mesaNumero?: number;
}

export interface CrearReservaGastronomiaDto {
  fecha: string;
  numeroPersonas: number;
  mesaId?: number;
}

export interface DisponibilidadDto {
  mesasDisponibles: number;
}

@Injectable({ providedIn: 'root' })
export class GastronomiaService {
  private readonly api = inject(ApiService);

  private normalize(item: EstablecimientoDto): EstablecimientoDto {
    const anyItem = item as any;
    const fotosFromCollection = Array.isArray(anyItem?.fotos)
      ? anyItem.fotos
          .map((f: any) => this.api.toPublicUrl(f?.url) || f?.url)
          .filter((u: string | undefined) => !!u)
      : [];

    const fotosUrls = [
      ...(item.fotosUrls || []).map(url => this.api.toPublicUrl(url) || url),
      ...fotosFromCollection
    ].filter((u, idx, arr) => !!u && arr.indexOf(u) === idx);

    return {
      ...item,
      fotoPrincipal: this.api.toPublicUrl(item.fotoPrincipal),
      fotosUrls,
    };
  }

  // ===== Públicos (sin autenticación) =====

  /** Listar todos los establecimientos */
  listAll(): Observable<EstablecimientoDto[]> {
    return this.api.get<EstablecimientoDto[]>('/Gastronomias').pipe(
      map(items => (items || []).map(item => this.normalize(item)))
    );
  }

  /** Detalle de un establecimiento */
  getById(id: number): Observable<EstablecimientoDto> {
    return this.api.get<EstablecimientoDto>(`/Gastronomias/${id}`).pipe(
      map(item => this.normalize(item))
    );
  }

  /** Listar menús de un establecimiento */
  getMenus(id: number): Observable<MenuDto[]> {
    return this.api.get<MenuDto[]>(`/Gastronomias/${id}/menus`);
  }

  /** Verificar disponibilidad en una fecha */
  getDisponibilidad(id: number, fecha: string): Observable<DisponibilidadDto> {
    return this.api.get<DisponibilidadDto>(`/Gastronomias/${id}/disponibilidad`, { fecha });
  }

  // ===== Oferente (autenticado) =====

  /** Crear establecimiento */
  create(payload: EstablecimientoDto): Observable<any> {
    return this.api.post('/Gastronomias', payload);
  }

  /** Crear menú */
  createMenu(establecimientoId: number, payload: { nombre: string }): Observable<any> {
    return this.api.post(`/Gastronomias/${establecimientoId}/menus`, payload);
  }

  /** Agregar item a menú */
  addMenuItem(establecimientoId: number, menuId: number, payload: MenuItemDto): Observable<any> {
    return this.api.post(`/Gastronomias/${establecimientoId}/menus/${menuId}/items`, payload);
  }

  /** Crear mesa */
  createMesa(establecimientoId: number, payload: { numero: number; capacidad: number }): Observable<any> {
    return this.api.post(`/Gastronomias/${establecimientoId}/mesas`, payload);
  }

  /** Cambiar disponibilidad de mesa */
  setMesaDisponible(establecimientoId: number, mesaId: number, disponible: boolean): Observable<any> {
    return this.api.put(`/Gastronomias/${establecimientoId}/mesas/${mesaId}/disponible`, disponible);
  }

  /** Actualizar disponibilidad de mesa */
  updateDisponibilidadMesa(establecimientoId: number, mesaId: number, disponible: boolean): Observable<any> {
    return this.api.put(`/Gastronomias/${establecimientoId}/mesas/${mesaId}/disponibilidad`, { disponible });
  }

  /** Listar reservas del establecimiento */
  getReservas(establecimientoId: number): Observable<ReservaGastronomiaDto[]> {
    return this.api.get<ReservaGastronomiaDto[]>(`/Gastronomias/${establecimientoId}/reservas`);
  }

  /** Listar establecimientos propios del oferente */
  listMine(): Observable<EstablecimientoDto[]> {
    return this.api.get<EstablecimientoDto[]>('/Gastronomias/mios').pipe(
      map(items => (items || []).map(item => this.normalize(item)))
    );
  }

  /** Actualizar establecimiento */
  update(id: number, payload: Partial<EstablecimientoDto>): Observable<any> {
    return this.api.put(`/Gastronomias/${id}`, payload);
  }

  /** Eliminar establecimiento */
  delete(id: number): Observable<any> {
    return this.api.delete(`/Gastronomias/${id}`);
  }

  // ===== Fotos =====

  /** Agregar fotos a un establecimiento */
  agregarFotos(id: number, urls: string[]): Observable<any> {
    return this.api.post(`/Gastronomias/${id}/fotos`, { urls });
  }

  /** Eliminar una foto */
  eliminarFoto(id: number, fotoId: number): Observable<any> {
    return this.api.delete(`/Gastronomias/${id}/fotos/${fotoId}`);
  }

  /** Reordenar fotos */
  reordenarFotos(id: number, fotoIds: number[]): Observable<any> {
    return this.api.put(`/Gastronomias/${id}/fotos/reordenar`, { fotoIds });
  }

  /** Subir imagen */
  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<{ url: string }>('/storage/upload?folder=gastronomia', formData).pipe(
      map(res => ({ url: this.api.toPublicUrl(res?.url) || '' }))
    );
  }

  // ===== Cliente (autenticado) =====

  /** Crear reserva */
  createReserva(establecimientoId: number, payload: CrearReservaGastronomiaDto): Observable<any> {
    return this.api.post(`/Gastronomias/${establecimientoId}/reservas`, payload);
  }
}
