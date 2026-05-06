import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';

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

  userInitials = signal('G');
  dropdownOpen = signal(false);
  isDesktop = signal(false);

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

  private getInitialsFromDisplayName(displayName: string): string {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return parts[0]?.slice(0, 2).toUpperCase() || 'GU';
  }

  private getInitialsFromEmail(email: string): string {
    const localPart = email.split('@')[0] ?? '';
    const chunks = localPart.split(/[._-]+/).filter(Boolean);

    if (chunks.length >= 2) {
      return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
    }

    const lettersOnly = localPart.replace(/[^a-zA-Z0-9]/g, '');
    return (lettersOnly.slice(0, 2) || 'GU').toUpperCase();
  }

  onResize(): void {
    this.isDesktop.set(window.innerWidth >= 1350);
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  onDocumentClick(): void {
    if (this.dropdownOpen()) {
      this.dropdownOpen.set(false);
    }
  }

  navigateTo(path: '/legal-notice' | '/privacy-policy'): void {
    this.dropdownOpen.set(false);
    this.router.navigate([path]);
  }

  onHelpClick(): void {
    this.dropdownOpen.set(false);
    this.router.navigate(['/help']);
  }

  async logout(): Promise<void> {
    this.dropdownOpen.set(false);
    try {
      await signOut(this.auth);
    } catch {
      // Keep navigation fallback even if sign-out fails.
    }
    this.router.navigate(['/login']);
  }
}
