import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl;
  readonly publicBaseUrl = this.baseUrl.replace(/\/api\/?$/i, '');

  constructor() { }

  private url(path: string) {
    // Ensure no double slashes
    return `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  toPublicUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.publicBaseUrl}${normalized}`;
  }

  get<T>(path: string, params?: HttpParams | { [key: string]: string | number | boolean }): Observable<T> {
    return this.http.get<T>(this.url(path), { params: params as any });
  }

  // Descarga de binarios (e.g., comprobantes)
  getBlob(path: string): Observable<Blob> {
    return this.http.get(this.url(path), { responseType: 'blob' as 'json' }) as any;
  }

  post<T>(path: string, body: any, headers?: HttpHeaders): Observable<T> {
    return this.http.post<T>(this.url(path), body, { headers });
  }

  postFormData<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(this.url(path), formData);
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: any): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }
}
