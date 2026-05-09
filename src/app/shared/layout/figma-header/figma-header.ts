import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { FbAuthService } from '../../../services/fb-auth-service';

@Component({
  selector: 'figma-header',
  imports: [CommonModule],
  templateUrl: './figma-header.html',
  styleUrls: ['./figma-header.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onResize()',
    '(document:click)': 'onDocumentClick()'
  }
})
export class FigmaHeader implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private authService = inject(FbAuthService);

  userInitials = signal('G');
  dropdownOpen = signal(false);
  isDesktop = signal(false);

  /**
   * Initializes responsive state and derives initials from auth user data.
   * @returns {void} No return value.
   */
  ngOnInit() {
    this.onResize();

    onAuthStateChanged(this.auth, (user) => {
      if (user?.displayName) {
        this.userInitials.set(this.getInitialsFromDisplayName(user.displayName));
      } else if (user?.email) {
        this.userInitials.set(this.getInitialsFromEmail(user.email));
      } else {
        this.userInitials.set('G');
      }
    });
  }

  /**
   * Builds user initials from a display name.
   * @param {string} displayName - Display name to parse.
   * @returns {string} Uppercase initials.
   */
  private getInitialsFromDisplayName(displayName: string): string {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return parts[0]?.slice(0, 2).toUpperCase() || 'GU';
  }

  /**
   * Builds fallback initials from email local-part.
   * @param {string} email - Email address to parse.
   * @returns {string} Uppercase initials.
   */
  private getInitialsFromEmail(email: string): string {
    const localPart = email.split('@')[0] ?? '';
    const chunks = localPart.split(/[._-]+/).filter(Boolean);

    if (chunks.length >= 2) {
      return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
    }

    const lettersOnly = localPart.replace(/[^a-zA-Z0-9]/g, '');
    return (lettersOnly.slice(0, 2) || 'GU').toUpperCase();
  }

  /**
   * Updates desktop breakpoint state on viewport resize.
   * @returns {void} No return value.
   */
  onResize(): void {
    this.isDesktop.set(window.innerWidth >= 1350);
  }

  /**
   * Toggles the user dropdown menu.
   * @param {MouseEvent} event - Click event from the user badge.
   * @returns {void} No return value.
   */
  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  /**
   * Closes dropdown when clicking outside of its trigger.
   * @returns {void} No return value.
   */
  onDocumentClick(): void {
    if (this.dropdownOpen()) {
      this.dropdownOpen.set(false);
    }
  }

  /**
   * Navigates to legal/privacy route and closes dropdown.
   * @param {'/legal-notice' | '/privacy-policy'} path - Target route path.
   * @returns {void} No return value.
   */
  navigateTo(path: '/legal-notice' | '/privacy-policy'): void {
    this.dropdownOpen.set(false);
    this.router.navigate([path]);
  }

  /**
   * Navigates to help page and closes dropdown.
   * @returns {void} No return value.
   */
  onHelpClick(): void {
    this.dropdownOpen.set(false);
    this.router.navigate(['/help']);
  }

  /**
   * Signs out the current user and redirects to login.
   * @returns {Promise<void>} Promise resolved after logout flow completes.
   */
  async logout(): Promise<void> {
    this.dropdownOpen.set(false);
    await this.authService.logout();
  }
}
