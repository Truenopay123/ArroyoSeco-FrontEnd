import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, tap } from 'rxjs';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role?: string;
  sexo?: string;
  fechaNacimiento?: string;
  lugarOrigen?: string;
  aceptaPoliticaDatos?: boolean;
}

export interface RegisterResponse {
  message?: string;
  confirmationEmailSent?: boolean;
  requiresEmailConfirmation?: boolean;
  requiresTwoFactorSetup?: boolean;
  key?: string;
  qrUri?: string;
  email?: string;
  token?: string;
  accessToken?: string;
  jwt?: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  passwordNueva: string;
}

type JwtPayload = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly tokenKey   = 'as_token';
  private readonly pending2fa = 'as_pending_2fa_email';

  constructor() { }

  private saveToken(token: string) { localStorage.setItem(this.tokenKey, token); }

  getToken(): string | null { return localStorage.getItem(this.tokenKey); }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const payload = this.decodeJwt(token);
    if (!payload) { this.logout(); return false; }
    const expClaimNames = ['exp', 'EXP', 'Exp'];
    let expValue: number | null = null;
    for (const key of expClaimNames) {
      if (payload[key]) { expValue = Number(payload[key]); break; }
    }
    if (expValue && !Number.isNaN(expValue)) {
      if (Date.now() / 1000 >= expValue) { this.logout(); return false; }
    }
    return true;
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.pending2fa);
  }

  // Se usa para flujos de compatibilidad (registro antiguo que devuelve token)
  persistToken(token: string) {
    this.saveToken(token);
  }

  // Guarda el email temporalmente cuando el backend pide 2FA
  savePending2FAEmail(email: string) { localStorage.setItem(this.pending2fa, email); }
  getPending2FAEmail(): string | null { return localStorage.getItem(this.pending2fa); }
  clearPending2FA() { localStorage.removeItem(this.pending2fa); }

  // --- Roles & JWT helpers ---
  private decodeJwt(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
      const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4 || 4)) % 4, '=');
      const bytes = Uint8Array.from(atob(padded), ch => ch.codePointAt(0) ?? 0);
      const json = new TextDecoder().decode(bytes);
      const parsed: unknown = JSON.parse(json);
      return parsed && typeof parsed === 'object' ? (parsed as JwtPayload) : null;
    } catch {
      return null;
    }
  }

  getRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];
    const payload = this.decodeJwt(token);
    if (!payload) return [];
    const roleClaimKeys = [
      'role', 'roles',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ];
    for (const key of roleClaimKeys) {
      const value = payload[key];
      if (!value) continue;
      if (Array.isArray(value)) return value.map(String);
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return [String(value)];
      }
    }
    return [];
  }

  isAdmin(): boolean { return this.getRoles().some(r => /admin/i.test(r)); }

  getTipoNegocio(): number | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = this.decodeJwt(token);
    if (!payload) return null;
    const tipo = payload['TipoOferente'] || payload['tipoOferente'] || payload['tipo_oferente'] || payload['Tipo'];
    return tipo ? Number(tipo) : null;
  }

  requiereCambioPassword(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const payload = this.decodeJwt(token);
    if (!payload) return false;
    const requiere = payload['RequiereCambioPassword'] || payload['requiereCambioPassword'] || payload['requiresPasswordChange'];
    return requiere === 'True' || requiere === true || requiere === 'true';
  }

  // --- HTTP calls ---

  login(payload: LoginPayload): Observable<any> {
    return this.api.post<any>('/auth/login', payload).pipe(
      tap(res => {
        const token = res?.token || res?.accessToken || res?.jwt;
        if (token) this.saveToken(token);
        // Si requiere 2FA, guardar email temporalmente
        if (res?.requiresTwoFactor && res?.email) {
          this.savePending2FAEmail(res.email);
        }
      })
    );
  }

  /** Completar login verificando código TOTP */
  verifyTotpLogin(email: string, codigo: string): Observable<any> {
    return this.api.post<any>('/auth/2fa/verify-login', { email, codigo }).pipe(
      tap(res => {
        const token = res?.token || res?.accessToken || res?.jwt;
        if (token) {
          this.saveToken(token);
          this.clearPending2FA();
        }
      })
    );
  }

  /** Obtener configuración 2FA (clave + QR URI) */
  get2FASetup(): Observable<any> {
    return this.api.get<any>('/auth/2fa/setup');
  }

  /** Habilitar 2FA verificando código */
  enable2FA(codigo: string): Observable<any> {
    return this.api.post<any>('/auth/2fa/enable', { codigo });
  }

  /** Deshabilitar 2FA */
  disable2FA(): Observable<any> {
    return this.api.post<any>('/auth/2fa/disable', {});
  }

  /** Actualizar datos demográficos */
  updateDemografia(data: { sexo?: string; fechaNacimiento?: string; lugarOrigen?: string }): Observable<any> {
    return this.api.put<any>('/auth/demografia', data);
  }

  register(payload: RegisterPayload): Observable<RegisterResponse> {
    return this.api.post<RegisterResponse>('/auth/register', payload);
  }

  enable2FAForRegistration(email: string, codigo: string): Observable<any> {
    return this.api.post<any>('/auth/2fa/enable-register', { email, codigo });
  }

  confirmEmail(email: string, token: string): Observable<any> {
    const qEmail = encodeURIComponent(email);
    const qToken = encodeURIComponent(token);
    return this.api.get<any>(`/auth/confirm-email?email=${qEmail}&token=${qToken}`);
  }

  resendConfirmation(email: string): Observable<any> {
    return this.api.post<any>('/auth/reenviar-confirmacion', { email });
  }

  forgotPassword(email: string): Observable<any> {
    return this.api.post<any>('/auth/forgot-password', { email });
  }

  resetPassword(payload: ResetPasswordPayload): Observable<any> {
    return this.api.post<any>('/auth/reset-password', payload);
  }

  me(): Observable<any> {
    return this.api.get<any>('/Auth/me');
  }
}
