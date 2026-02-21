import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionesService, NotificacionDto } from '../../services/notificaciones.service';
import { first } from 'rxjs/operators';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

@Component({
  selector: 'app-oferente-notificaciones',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="notificaciones">
      <h2>Notificaciones</h2>

      <div class="lista" *ngIf="notificaciones.length; else empty">
        <article *ngFor="let n of notificaciones" class="item" [class.leida]="n.leida">
          <div class="item__main">
            <h3>{{ n.titulo }}</h3>
            <p>{{ n.mensaje }}</p>
          </div>
          <div class="item__side">
            <span class="fecha">{{ n.fecha }}</span>
            <button class="btn" (click)="toggleLeida(n)">{{ n.leida ? 'Marcar como no leída' : 'Marcar como leída' }}</button>
          </div>
        </article>
      </div>

      <ng-template #empty>
        <div class="placeholder">
          <p>No tienes notificaciones nuevas.</p>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .notificaciones { display: grid; gap: 1.5rem; }
    h2 { margin: 0; font-size: 1.6rem; color: var(--color-text, #1f2937); }
    .lista { display: grid; gap: .75rem; }
    .item {
      background: #fff;
      border-radius: 12px;
      padding: 1.25rem;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 1rem;
      border: 1px solid var(--color-border, #e5e7eb);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transition: box-shadow 0.2s;
      border-left: 4px solid var(--color-primary, #E31B23);
    }
    .item:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
    .item.leida { opacity: .6; border-left-color: var(--color-border, #e5e7eb); }
    .item h3 { margin: 0 0 .25rem; font-size: 1.05rem; font-weight: 600; color: var(--color-text, #1f2937); }
    .item p { margin: 0; color: #4b5563; line-height: 1.6; }
    .item__side { display: grid; gap: .5rem; justify-items: end; }
    .fecha { font-size: .85rem; color: var(--color-text-secondary, #6b7280); }
    .btn {
      padding: .5rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--color-primary, #E31B23);
      color: var(--color-primary, #E31B23);
      background: #fff;
      cursor: pointer;
      font-weight: 600;
      font-size: .9rem;
      transition: all 0.2s;
    }
    .btn:hover { background: var(--color-primary, #E31B23); color: #fff; }
    .placeholder { background: #fff; padding: 3rem; border-radius: 12px; text-align: center; color: var(--color-text-secondary, #6b7280); border: 1px solid var(--color-border, #e5e7eb); }
    @media (max-width: 768px) {
      .item { grid-template-columns: 1fr; }
      .item__side { justify-items: stretch; }
      .btn { width: 100%; text-align: center; }
    }
  `]
})
export class OferenteNotificacionesComponent implements OnInit {
  notificaciones: Notificacion[] = [];
  loading = false;
  error: string | null = null;

  constructor(private notiService: NotificacionesService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.notiService.list(false).pipe(first()).subscribe({
      next: (data: NotificacionDto[]) => {
        this.notificaciones = (data || []).map(d => {
          const rawId = (d as any)?.id ?? (d as any)?.ID ?? (d as any)?.notificacionId ?? (d as any)?.NotificacionId;
          return {
            id: String(rawId ?? ''),
            titulo: d.titulo || 'Notificación',
            mensaje: d.mensaje,
            fecha: d.fecha || new Date().toLocaleDateString(),
            leida: !!d.leida
          };
        }).filter(n => n.id !== '');
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar notificaciones';
        this.loading = false;
      }
    });
  }

  toggleLeida(n: Notificacion) {
    const nuevoEstado = !n.leida;
    this.notiService.marcarLeida(n.id).pipe(first()).subscribe({
      next: () => n.leida = nuevoEstado,
      error: () => this.error = 'Error al actualizar notificación'
    });
  }
}
