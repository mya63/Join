import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'auth-footer-nav',
  imports: [CommonModule],
  templateUrl: './auth-footer-nav.html',
  styleUrl: './auth-footer-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthFooterNav {
  private router = inject(Router);

  /**
   * Checks whether the current URL starts with the provided route path.
   * @param {'/login' | '/privacy-policy' | '/legal-notice'} path - Route prefix to compare.
   * @returns {boolean} True when the current URL matches the route prefix.
   */
  isRoute(path: '/login' | '/privacy-policy' | '/legal-notice'): boolean {
    return this.router.url.startsWith(path);
  }

  /**
   * Navigates to login route.
   * @returns {void} No return value.
   */
  goLogin(): void { this.router.navigate(['/login']);}
  /**
   * Navigates to privacy-policy route.
   * @returns {void} No return value.
   */
  goPrivacy(): void { this.router.navigate(['/privacy-policy']); }
  /**
   * Navigates to legal-notice route.
   * @returns {void} No return value.
   */
  goLegal(): void { this.router.navigate(['/legal-notice']); }
}
