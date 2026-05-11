import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FbAuthService } from '../services/fb-auth-service';

/**
 * Protects private routes and redirects unauthenticated users to login.
 * @returns {Promise<boolean | import('@angular/router').UrlTree>} True for authenticated access, otherwise login UrlTree.
 */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(FbAuthService);
  const router = inject(Router);
  const hasSession = !!authService.getCurrentUserId() || authService.isLocallyLoggedIn();

  if (hasSession) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
