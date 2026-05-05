import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FbAuthService } from '../services/fb-auth-service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(FbAuthService);
  private cdr = inject(ChangeDetectorRef);

  email: string = '';
  password: string = '';
  showSignUpSuccess = signal(false);

  loginErrors: { email: string; password: string; firebase: string } = { email: '', password: '', firebase: '' };
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['email']) this.email = params['email'];
    if (params['password']) this.password = params['password'];
    if (params['signupSuccess'] === '1') {
      this.showSignUpSuccess.set(true);
      setTimeout(() => this.showSignUpSuccess.set(false), 2000);
    }
  }

  private resetErrors(): void {
    this.loginErrors = { email: '', password: '', firebase: '' };
  }

  private validateEmail(): void {
    const email = this.email.trim();
    this.loginErrors.email = '';
    if (!email) {
      this.loginErrors.email = 'Please enter your email.';
      return;
    }
    if (!this.emailPattern.test(email)) {
      this.loginErrors.email = 'Please enter a valid email address.';
    }
  }

  onEmailInput(): void {
    this.loginErrors.firebase = '';
    const email = this.email.trim();
    if (!email) {
      this.loginErrors.email = '';
      return;
    }
    this.loginErrors.email = this.emailPattern.test(email)
      ? ''
      : 'Please enter a valid email address.';
  }

  onPasswordInput(): void {
    this.loginErrors.firebase = '';
    if (this.password) {
      this.loginErrors.password = '';
    }
  }

  goToSignUp(): void {
    this.router.navigate(['sign-up']);
  }

  private handleFirebaseError(error: any): void {
    console.error('Login failed:', error);
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        this.loginErrors.firebase = 'Falsche E-Mail oder falsches Passwort.';
        break;
      case 'auth/invalid-email':
        this.loginErrors.firebase = 'Bitte eine gültige E-Mail-Adresse eingeben.';
        break;
      case 'auth/user-disabled':
        this.loginErrors.firebase = 'Dieses Konto wurde deaktiviert.';
        break;
      case 'auth/network-request-failed':
        this.loginErrors.firebase = 'Netzwerkfehler. Bitte Verbindung prüfen.';
        break;
      default:
        this.loginErrors.firebase = 'Login fehlgeschlagen. Bitte erneut versuchen.';
    }
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    this.resetErrors();
    this.validateEmail();

    if (!this.password) {
      this.loginErrors.password = 'Please enter your password.';
    }
    if (this.loginErrors.email || this.loginErrors.password) {
      return;
    }
    this.authService.login(this.email.trim(), this.password).catch(error => {
      this.handleFirebaseError(error);
    });
  }

  onGuestLogin(): void {
    this.router.navigate(['contacts']);
  }

  resetForm(): void {
    this.email = '';
    this.password = '';
  }
}
