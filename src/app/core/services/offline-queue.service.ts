import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface QueuedRequest {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body: unknown;
  headers: Record<string, string>;
  timestamp: number;
  description: string;
}

const STORAGE_KEY = 'offline_queue';

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  private readonly _pending$ = new BehaviorSubject<number>(this.loadQueue().length);
  readonly pending$ = this._pending$.asObservable();

  /** Emite cuando se sincronizan acciones exitosamente */
  private readonly _synced$ = new Subject<number>();
  readonly synced$ = this._synced$.asObservable();

  get pendingCount(): number {
    return this._pending$.value;
  }

  /** Encola una petición de escritura para enviar cuando haya conexión */
  enqueue(entry: Omit<QueuedRequest, 'id' | 'timestamp'>): void {
    const queue = this.loadQueue();
    queue.push({
      ...entry,
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now()
    });
    this.saveQueue(queue);
    this._pending$.next(queue.length);
  }

  /** Procesa toda la cola secuencialmente */
  async flush(): Promise<void> {
    const queue = this.loadQueue();
    if (!queue.length) return;

    const token = this.auth.getToken();
    let sent = 0;
    let failed = 0;
    const remaining: QueuedRequest[] = [];

    for (const entry of queue) {
      try {
        const headers: Record<string, string> = {
          ...entry.headers,
          'X-Offline-Sync': 'true'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const httpHeaders = new HttpHeaders(headers);
        const fullUrl = this.resolveUrl(entry.url);

        switch (entry.method) {
          case 'POST':
            await firstValueFrom(this.http.post(fullUrl, entry.body, { headers: httpHeaders }));
            break;
          case 'PUT':
            await firstValueFrom(this.http.put(fullUrl, entry.body, { headers: httpHeaders }));
            break;
          case 'PATCH':
            await firstValueFrom(this.http.patch(fullUrl, entry.body, { headers: httpHeaders }));
            break;
          case 'DELETE':
            await firstValueFrom(this.http.delete(fullUrl, { headers: httpHeaders }));
            break;
        }
        sent++;
      } catch (err) {
        const status = (err instanceof HttpErrorResponse) ? err.status : 0;
        // No reintentar errores de cliente (4xx) excepto 401/408/429
        if (status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429) {
          failed++;
          // Descartar: error de validación/conflicto que no se resolverá reintentando
        } else {
          failed++;
          remaining.push(entry);
        }
      }
    }

    this.saveQueue(remaining);
    this._pending$.next(remaining.length);

    if (sent > 0) {
      this.toast.success(`Se sincronizaron ${sent} acción${sent > 1 ? 'es' : ''} pendiente${sent > 1 ? 's' : ''}.`);
      this._synced$.next(sent);
    }
    if (failed > 0) {
      this.toast.warning(`${failed} acción${failed > 1 ? 'es' : ''} no se pudieron sincronizar y serán reintentadas.`);
    }
  }

  /** Descarta toda la cola */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._pending$.next(0);
  }

  private resolveUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    const base = environment.apiUrl;
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private loadQueue(): QueuedRequest[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedRequest[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
}
