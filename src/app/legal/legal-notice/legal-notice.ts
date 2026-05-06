import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AuthFooterNav } from '../../login/auth-footer-nav/auth-footer-nav';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-legal-notce',
  imports: [CommonModule, AuthFooterNav],
  templateUrl: './legal-notice.html',
  styleUrl: './legal-notice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalNotice implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private auth = inject(Auth);

  isExternal = signal(!this.auth.currentUser);

  ngOnInit(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.isExternal.set(!user);
    });
  }

  goBack(): void {
    this.location.back();
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }

  goPrivacy(): void {
    this.router.navigate(['/privacy-policy']);
  }

  goLegal(): void {
    this.router.navigate(['/legal-notice']);
  }
}
