import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { Router } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const loading = inject(LoadingService);

  const isAuthEndpoint = /\/Auth\/(login|register)$/i.test(req.url);
  const token = auth.getToken();

  const reqToSend = !isAuthEndpoint && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

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
