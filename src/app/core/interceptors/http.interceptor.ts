import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { OfflineQueueService } from '../services/offline-queue.service';
import { ToastService } from '../../shared/services/toast.service';
import { Router } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { throwError, of } from 'rxjs';

/** Métodos HTTP que pueden encolarse offline */
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** Patrones de URL que NO deben encolarse (auth, login, pagos externos) */
const SKIP_QUEUE_PATTERNS = [
  /\/Auth\//i,
  /\/pagos\//i,
  /\/storage\/upload/i,
  /\/auth\/face\//i
];

function shouldQueueOffline(method: string, url: string): boolean {
  if (!WRITE_METHODS.includes(method)) return false;
  return !SKIP_QUEUE_PATTERNS.some(p => p.test(url));
}

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const loading = inject(LoadingService);
  const offlineQueue = inject(OfflineQueueService);
  const toast = inject(ToastService);

  // Si ya viene de la sincronización offline, dejar pasar sin encolar de nuevo
  if (req.headers.has('X-Offline-Sync')) {
    return next(req);
  }

  const isAuthEndpoint = /\/Auth\/(login|register)$/i.test(req.url);
  const token = auth.getToken();

  const reqToSend = !isAuthEndpoint && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // Si estamos offline y es una petición de escritura encolable, guardarla
  if (!navigator.onLine && shouldQueueOffline(req.method, req.url)) {
    loading.show();

    const pathMatch = req.url.match(/\/api(\/.*)/i);
    const urlPath = pathMatch ? pathMatch[1] : req.url;

    offlineQueue.enqueue({
      method: req.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      url: urlPath,
      body: req.body,
      headers: {},
      description: `${req.method} ${urlPath}`
    });

    toast.info('Sin conexión: tu acción se guardó y se enviará automáticamente al reconectarte.');
    loading.hide();

    // Devolver una respuesta vacía exitosa para que el componente no muestre error
    return of(new HttpResponse({ status: 202, body: { queued: true } }));
  }

  // Show global spinner
  loading.show();

  return next(reqToSend).pipe(
    catchError((error: HttpErrorResponse) => {
      // Omitir log si la petición marca cabecera de silencio
      const skipLog = req.headers.has('X-Skip-Error-Log');
      if (!skipLog) {
        console.error('HTTP Error:', error.status, error.url, error.error);
      }
      
      // If unauthorized on a protected call, clear token and redirect to appropriate login
      // BUT: No hacer logout en POST de creación de reservas (podría ser error del backend, no de auth)
      if (error.status === 401 && !isAuthEndpoint && token) {
        // Detectar endpoints de reservas (case-insensitive)
        const isReservationCreate = /\/(reservas|reservasGastronomia)/i.test(req.url) && req.method === 'POST';
        // Excepción adicional: descarga de comprobante (GET) no debe cerrar sesión automáticamente
        const isComprobanteDownload = /\/(reservas|reservasGastronomia)\/.+\/comprobante$/i.test(req.url);
        
        // Si NO es un endpoint de reserva, hacer logout
        if (!isReservationCreate && !isComprobanteDownload) {
          console.warn('Logout automático por 401 en:', req.url);
          auth.logout();
          const url = req.url.toLowerCase();
          if (url.includes('/admin/')) {
            router.navigateByUrl('/admin/login');
          } else if (url.includes('/oferente/')) {
            router.navigateByUrl('/oferente/login');
          } else {
            router.navigateByUrl('/cliente/login');
          }
        } else {
          console.warn('401 en endpoint de reserva/comprobante - no hacer logout automático:', req.url);
        }
      }

      if (error.status === 403) {
        router.navigateByUrl('/forbidden');
      }
      return throwError(() => error);
    }),
    finalize(() => loading.hide())
  );
};
