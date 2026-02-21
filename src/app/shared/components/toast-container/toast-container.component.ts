import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toasts$ | async"
        class="toast"
        [class.success]="toast.type === 'success'"
        [class.error]="toast.type === 'error'"
        [class.warning]="toast.type === 'warning'"
        [class.info]="toast.type === 'info'"
      >
        <div class="toast__icon">
          <svg *ngIf="toast.type === 'success'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
          <svg *ngIf="toast.type === 'error'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
          <svg *ngIf="toast.type === 'warning'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
          <svg *ngIf="toast.type === 'info'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </div>
        <div class="toast__message">{{ toast.message }}</div>
        <button class="toast__close" (click)="remove(toast.id)">×</button>
        <div class="toast__progress" *ngIf="toast.duration"
             [style.animation-duration.ms]="toast.duration"
             [class.success]="toast.type === 'success'"
             [class.error]="toast.type === 'error'"
             [class.warning]="toast.type === 'warning'"
             [class.info]="toast.type === 'info'"></div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: min(90vw, 420px);
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      animation: slideIn 0.3s ease-out;
      min-width: 300px;
      position: relative;
      overflow: hidden;
      flex-wrap: wrap;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast__icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
    }

    .toast__icon svg {
      width: 100%;
      height: 100%;
    }

    .toast.success {
      border-left: 4px solid #10b981;
    }

    .toast.success .toast__icon {
      color: #10b981;
    }

    .toast.error {
      border-left: 4px solid #ef4444;
    }

    .toast.error .toast__icon {
      color: #ef4444;
    }

    .toast.warning {
      border-left: 4px solid #f59e0b;
    }

    .toast.warning .toast__icon {
      color: #f59e0b;
    }

    .toast.info {
      border-left: 4px solid #3b82f6;
    }

    .toast.info .toast__icon {
      color: #3b82f6;
    }

    .toast__message {
      flex: 1;
      color: #1f2937;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .toast__close {
      flex-shrink: 0;
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      color: #9ca3af;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .toast__close:hover {
      background: #f3f4f6;
      color: #4b5563;
    }

    .toast__progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      border-radius: 0 0 12px 12px;
      animation: progressShrink linear forwards;
      transform-origin: left;
    }

    .toast__progress.success { background: #10b981; }
    .toast__progress.error   { background: #ef4444; }
    .toast__progress.warning { background: #f59e0b; }
    .toast__progress.info    { background: #3b82f6; }

    @keyframes progressShrink {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }

    @media (max-width: 768px) {
      .toast-container {
        left: 1rem;
        right: 1rem;
        max-width: none;
      }

      .toast {
        min-width: auto;
      }
    }
  `]
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);
  toasts$ = this.toastService.toasts$;

  remove(id: string) {
    this.toastService.remove(id);
  }
}
