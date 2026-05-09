import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AuthFooterNav } from '../../login/auth-footer-nav/auth-footer-nav';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-privacy-policy',
  imports: [CommonModule, AuthFooterNav],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicy implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private auth = inject(Auth);

  isExternal = signal(!this.auth.currentUser);

  /**
   * Syncs external/internal layout mode with authentication state.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.isExternal.set(!user);
    });
  }

  /**
   * Navigates back in browser history.
   * @returns {void} No return value.
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Navigates to login route.
   * @returns {void} No return value.
   */
  goLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Navigates to privacy-policy route.
   * @returns {void} No return value.
   */
  goPrivacy(): void {
    this.router.navigate(['/privacy-policy']);
  }

  /**
   * Navigates to legal-notice route.
   * @returns {void} No return value.
   */
  goLegal(): void {
    this.router.navigate(['/legal-notice']);
  }
}
