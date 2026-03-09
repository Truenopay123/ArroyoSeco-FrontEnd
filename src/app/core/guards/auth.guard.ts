import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    if (state.url.startsWith('/admin')) return router.parseUrl('/admin/login');
    if (state.url.startsWith('/oferente')) return router.parseUrl('/oferente/login');
    return router.parseUrl('/cliente/login');
  }

  const expectedRoles = (route.data?.['roles'] as string[] | undefined) ?? [];
  if (expectedRoles.length > 0) {
    const userRoles = new Set(auth.getRoles().map(r => r.toLowerCase()));
    const allowed = expectedRoles.some(role => userRoles.has(role.toLowerCase()));
    if (!allowed) return router.parseUrl('/forbidden');
  }

  return true;
};
