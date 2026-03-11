import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface PerfilUpdateDto {
  nombre?: string;
  email?: string;
  telefono?: string;
}

export interface PasswordUpdateDto {
  passwordActual: string;
  nuevaPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly api = inject(ApiService);

  updatePerfil(payload: PerfilUpdateDto): Observable<any> {
    // Endpoint para actualizar email y teléfono
    return this.api.put('/auth/perfil', { email: payload.email, telefono: payload.telefono }).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  cambiarPassword(payload: PasswordUpdateDto): Observable<any> {
    // Endpoint tentativo; ajustar según backend
    return this.api.put('/usuarios/password', payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }
}
