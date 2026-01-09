import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'auth-footer-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-footer-nav.html',
  styleUrl: './auth-footer-nav.scss',
})
export class AuthFooterNav {
constructor(private router: Router) {
  }

  goLogin(): void { this.router.navigate(['/login']);}
  goPrivacy(): void { this.router.navigate(['/privacy-policy']); }
  goLegal(): void { this.router.navigate(['/legal-notice']); }
}
