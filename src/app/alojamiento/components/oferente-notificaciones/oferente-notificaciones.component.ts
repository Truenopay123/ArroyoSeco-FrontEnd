import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificacionesService, NotificacionDto } from '../../services/notificaciones.service';
import { first } from 'rxjs/operators';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  reservaFolio?: string;
  alojamientoNombre?: string;
}

@Component({
  selector: 'app-oferente-notificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="notificaciones">
      <div class="head">
        <h2>Notificaciones</h2>
        <div class="filters">
          <label>
            Desde
            <input type="date" [(ngModel)]="fromDate" (change)="applyFilters()" />
          </label>
          <label>
            Hasta
            <input type="date" [(ngModel)]="toDate" (change)="applyFilters()" />
          </label>
          <label class="check">
            <input type="checkbox" [(ngModel)]="soloNoLeidas" (change)="applyFilters()" />
            Solo no leídas
          </label>
        </div>
      </div>

      <div *ngIf="loading" class="placeholder"><p>Cargando notificaciones...</p></div>
      <div *ngIf="!loading && error" class="placeholder error"><p>{{ error }}</p></div>

      <div class="lista" *ngIf="!loading && !error && notificaciones.length; else empty">
        <article *ngFor="let n of notificaciones" class="item" [class.leida]="n.leida">
          <div class="item__main">
            <h3>{{ n.titulo }}</h3>
            <p>{{ n.mensaje }}</p>
            <div class="meta" *ngIf="n.alojamientoNombre || n.reservaFolio">
              <span *ngIf="n.alojamientoNombre" class="chip aloj">🏠 {{ n.alojamientoNombre }}</span>
            </div>
          </div>
          <div class="item__side">
            <span class="fecha">{{ formatFecha(n.fecha) }}</span>
            <button class="btn" (click)="toggleLeida(n)">{{ n.leida ? 'Marcar como no leída' : 'Marcar como leída' }}</button>
          </div>
        </article>
      </div>

      <div class="pager" *ngIf="!loading && totalPages > 1">
        <button class="btn btn-page" [disabled]="page <= 1" (click)="goToPage(page - 1)">Anterior</button>
        <span>Página {{ page }} de {{ totalPages }} · {{ total }} notificaciones</span>
        <button class="btn btn-page" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">Siguiente</button>
      </div>

      <ng-template #empty>
        <div class="placeholder" *ngIf="!loading && !error">
          <p>No tienes notificaciones nuevas.</p>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .notificaciones { display: grid; gap: 1.25rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
    h2 { margin: 0; font-size: 1.6rem; color: var(--color-text, #1f2937); }
    .filters { display: flex; gap: .8rem; flex-wrap: wrap; }
    .filters label { display: grid; gap: .25rem; font-size: .82rem; color: #4b5563; font-weight: 600; }
    .filters input[type="date"] { border: 1px solid #d1d5db; border-radius: 8px; padding: .45rem .6rem; }
    .filters .check { display: flex; align-items: center; gap: .4rem; margin-top: 1.25rem; }
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
      border-left: 4px solid var(--color-primary, #1F7D4D);
    }
    .item:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
    .item.leida { opacity: .6; border-left-color: var(--color-border, #e5e7eb); }
    .item h3 { margin: 0 0 .25rem; font-size: 1.05rem; font-weight: 600; color: var(--color-text, #1f2937); }
    .item p { margin: 0; color: #4b5563; line-height: 1.6; }
    .meta { margin-top: .5rem; display: flex; gap: .45rem; flex-wrap: wrap; }
    .chip { font-size: .74rem; font-weight: 700; border-radius: 999px; padding: .2rem .55rem; }
    .chip.aloj { background: #e8f5e9; color: #155e3e; border: 1px solid #b8dfcf; }
    .chip.folio { background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; }
    .item__side { display: grid; gap: .5rem; justify-items: end; }
    .fecha { font-size: .85rem; color: var(--color-text-secondary, #6b7280); }
    .btn {
      padding: .5rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--color-primary, #1F7D4D);
      color: var(--color-primary, #1F7D4D);
      background: #fff;
      cursor: pointer;
      font-weight: 600;
      font-size: .9rem;
      transition: all 0.2s;
    }
    .btn:hover { background: var(--color-primary, #1F7D4D); color: #fff; }
    .pager { display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: .8rem 1rem; }
    .btn-page { min-width: 92px; }
    .btn-page[disabled] { opacity: .5; cursor: not-allowed; }
    .error p { color: #b91c1c; }
    .placeholder { background: #fff; padding: 3rem; border-radius: 12px; text-align: center; color: var(--color-text-secondary, #6b7280); border: 1px solid var(--color-border, #e5e7eb); }
    @media (max-width: 768px) {
      .head { align-items: stretch; }
      .filters { width: 100%; }
      .item { grid-template-columns: 1fr; }
      .item__side { justify-items: stretch; }
      .btn { width: 100%; text-align: center; }
      .pager { flex-direction: column; gap: .6rem; }
    }
  `]
})
export class OferenteNotificacionesComponent implements OnInit {
  notificaciones: Notificacion[] = [];
  loading = false;
  error: string | null = null;
  page = 1;
  pageSize = 8;
  total = 0;
  totalPages = 1;
  soloNoLeidas = false;
  fromDate = '';
  toDate = '';

  constructor(private notiService: NotificacionesService) {}

  ngOnInit(): void {
    this.load();
  }

  applyFilters() {
    this.page = 1;
    this.load();
  }

  goToPage(next: number) {
    if (next < 1 || next > this.totalPages) return;
    this.page = next;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = null;
    this.notiService.listPaged({
      page: this.page,
      pageSize: this.pageSize,
      soloNoLeidas: this.soloNoLeidas,
      from: this.fromDate || undefined,
      to: this.toDate || undefined
    }).pipe(first()).subscribe({
      next: (res) => {
        this.total = res?.total || 0;
        this.totalPages = res?.totalPages || 1;
        this.notificaciones = (res?.items || []).map((d: NotificacionDto) => {
          const rawId = (d as any)?.id ?? (d as any)?.ID ?? (d as any)?.notificacionId ?? (d as any)?.NotificacionId;
          return {
            id: String(rawId ?? ''),
            titulo: d.titulo || 'Notificación',
            mensaje: d.mensaje,
            fecha: d.fecha || new Date().toLocaleDateString(),
            leida: !!d.leida,
            reservaFolio: d.reservaFolio,
            alojamientoNombre: d.alojamientoNombre
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

  formatFecha(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  toggleLeida(n: Notificacion) {
    this.notiService.marcarLeida(n.id).pipe(first()).subscribe({
      next: () => {
        n.leida = !n.leida;
      },
      error: () => this.error = 'Error al actualizar notificación'
    });
  }
}
