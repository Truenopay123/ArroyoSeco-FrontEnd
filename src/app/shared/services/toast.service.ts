import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  show(message: string, type: Toast['type'] = 'info', duration = 5000) {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, type, duration };

    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, duration = 5000) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 6000) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 5000) {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration = 5500) {
    this.show(message, 'warning', duration);
  }

  remove(id: string) {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }
}
