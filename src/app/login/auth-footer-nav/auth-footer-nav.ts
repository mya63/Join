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

  goLogin(): void { this.router.navigate(['/login']);}
  goPrivacy(): void { this.router.navigate(['/privacy-policy']); }
  goLegal(): void { this.router.navigate(['/legal-notice']); }
}
