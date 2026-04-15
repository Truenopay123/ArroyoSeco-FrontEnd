import { Component, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesGastronomiaService } from '../../../shared/services/favorites-gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { GastronomiaService } from '../../services/gastronomia.service';

@Component({
  selector: 'app-cliente-favoritos-gastronomia',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cliente-favoritos-gastronomia.component.html',
  styleUrls: ['./cliente-favoritos-gastronomia.component.scss']
})
export class ClienteFavoritosGastronomiaComponent implements OnInit {
  favoritos = computed(() => this.favs.getAll());

  constructor(
    private favs: FavoritesGastronomiaService,
    private toast: ToastService,
    private gastronomiaService: GastronomiaService
  ) {}

  ngOnInit(): void {
    this.refreshImages();
  }

  private refreshImages(): void {
    const favs = this.favs.getAll();
    if (favs.length === 0) return;

    this.gastronomiaService.listAll().subscribe({
      next: establecimientos => {
        let updated = false;
        for (const fav of favs) {
          const fresh = establecimientos.find(e => e.id === fav.id);
          if (fresh) {
            const newImg = fresh.fotoPrincipal || (fresh.fotosUrls?.length ? fresh.fotosUrls[0] : '') || 'assets/images/PuenteRio.jpeg';
            if (newImg !== fav.imagen) {
              fav.imagen = newImg;
              updated = true;
            }
          }
        }
        if (updated) {
          this.favs.updateAll(favs);
        }
      },
      error: () => {}
    });
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.dataset['fallback']) {
      img.dataset['fallback'] = '1';
      img.src = 'assets/images/PuenteRio.jpeg';
    }
  }

  remove(id: number) {
    this.favs.remove(id);
    this.toast.info('Eliminado de favoritos');
  }

  clearAll() {
    if (this.favoritos().length === 0) return;
    this.favs.clear();
    this.toast.warning('Lista de favoritos vaciada');
  }
}
