import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _count = 0;
  private readonly _loading$ = new BehaviorSubject<boolean>(false);

  /** Observable that emits true while any HTTP request is in flight */
  readonly loading$ = this._loading$.asObservable();

  show(): void {
    this._count++;
    if (this._count === 1) {
      queueMicrotask(() => this._loading$.next(true));
    }
  }

  hide(): void {
    this._count = Math.max(0, this._count - 1);
    if (this._count === 0) {
      queueMicrotask(() => this._loading$.next(false));
    }
  }
}
