import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FavoriteEstablecimiento {
  id: number;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  imagen: string;
}

const STORAGE_KEY = 'cliente_favoritos_gastro_v1';

@Injectable({ providedIn: 'root' })
export class FavoritesGastronomiaService {
  private favoritesSubject = new BehaviorSubject<FavoriteEstablecimiento[]>(this.loadInitial());
  favorites$ = this.favoritesSubject.asObservable();

  private loadInitial(): FavoriteEstablecimiento[] {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return [];
      return JSON.parse(raw) as FavoriteEstablecimiento[];
    } catch {
      return [];
    }
  }

  private persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favoritesSubject.value));
      }
    } catch {}
  }

  getAll(): FavoriteEstablecimiento[] {
    return this.favoritesSubject.value;
  }

  isFavorite(id: number): boolean {
    return this.favoritesSubject.value.some(f => f.id === id);
  }

  add(establecimiento: FavoriteEstablecimiento) {
    if (this.isFavorite(establecimiento.id)) return;
    const updated = [...this.favoritesSubject.value, establecimiento];
    this.favoritesSubject.next(updated);
    this.persist();
  }

  remove(id: number) {
    const updated = this.favoritesSubject.value.filter(f => f.id !== id);
    this.favoritesSubject.next(updated);
    this.persist();
  }

  toggle(establecimiento: FavoriteEstablecimiento) {
    if (this.isFavorite(establecimiento.id)) {
      this.remove(establecimiento.id);
    } else {
      this.add(establecimiento);
    }
  }

  clear() {
    this.favoritesSubject.next([]);
    this.persist();
  }

  updateAll(items: FavoriteEstablecimiento[]) {
    this.favoritesSubject.next([...items]);
    this.persist();
  }
}
