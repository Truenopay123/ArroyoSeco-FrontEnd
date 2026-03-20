import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { first } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
	selector: 'app-admin-quejas',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './admin-quejas.component.html',
	styleUrl: './admin-quejas.component.scss'
})
export class AdminQuejasComponent implements OnInit {
	private readonly api = inject(ApiService);
	private readonly toast = inject(ToastService);

	loading = false;
	resenas: any[] = [];

	ngOnInit(): void {
		this.cargar();
	}

	cargar() {
		this.loading = true;
		this.api.get<any[]>('/resenas/reportadas').pipe(first()).subscribe({
			next: (rows) => {
				this.resenas = rows || [];
				this.loading = false;
			},
			error: () => {
				this.toast.error('No se pudieron cargar las reseñas reportadas');
				this.loading = false;
			}
		});
	}

	eliminar(id: number) {
		if (!confirm('¿Eliminar esta reseña? Ya no será visible para nadie.')) return;
		this.api.delete(`/resenas/${id}`).pipe(first()).subscribe({
			next: () => {
				this.toast.success('Reseña eliminada');
				this.cargar();
			},
			error: () => this.toast.error('No se pudo eliminar la reseña')
		});
	}

	desestimar(id: number) {
		if (!confirm('¿Desestimar el reporte? La reseña volverá a ser pública.')) return;
		this.api.patch(`/resenas/${id}/desestimar-reporte`, {}).pipe(first()).subscribe({
			next: () => {
				this.toast.success('Reporte desestimado. Reseña restaurada.');
				this.cargar();
			},
			error: () => this.toast.error('No se pudo desestimar el reporte')
		});
	}
}
