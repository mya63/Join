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

  /**
   * Initializes login form state from optional route query parameters.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['email']) this.email = params['email'];
    if (params['password']) this.password = params['password'];
    if (params['signupSuccess'] === '1') {
      this.showSignUpSuccess.set(true);
      /**
       * Clears the sign-up success banner after the display timeout.
       * @returns {void} No return value.
       */
      setTimeout(() => this.showSignUpSuccess.set(false), 2000);
    }
  }

  /**
   * Clears all form-level and Firebase error messages.
   * @returns {void} No return value.
   */
  private resetErrors(): void {
    this.loginErrors = { email: '', password: '', firebase: '' };
  }

  /**
   * Validates email input and sets user-facing validation messages.
   * @returns {void} No return value.
   */
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

  /**
   * Revalidates email while typing and clears backend error feedback.
   * @returns {void} No return value.
   */
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

  /**
   * Revalidates password field while typing and clears backend error feedback.
   * @returns {void} No return value.
   */
  onPasswordInput(): void {
    this.loginErrors.firebase = '';
    if (this.password) {
      this.loginErrors.password = '';
    }
  }

  /**
   * Navigates to the sign-up page.
   * @returns {void} No return value.
   */
  goToSignUp(): void {
    this.router.navigate(['sign-up']);
  }

  /**
   * Maps Firebase authentication errors to localized UI messages.
   * @param {any} error - Firebase auth error payload.
   * @returns {void} No return value.
   */
  private handleFirebaseError(error: any): void {
    this.loginErrors.firebase = this.getFirebaseErrorMessage(error);
    this.cdr.markForCheck();
  }

  /**
   * Maps a Firebase authentication error code to a localized UI message.
   * @param {any} error - Firebase auth error payload.
   * @returns {string} Localized error message for display.
   */
  private getFirebaseErrorMessage(error: any): string {
    const code = String(error?.code || '');
    const groupedInvalidCredentials = new Set(['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password']);
    if (groupedInvalidCredentials.has(code)) return 'Falsche E-Mail oder falsches Passwort.';

    const messages: Record<string, string> = {
      'auth/invalid-email': 'Bitte eine gültige E-Mail-Adresse eingeben.',
      'auth/user-disabled': 'Dieses Konto wurde deaktiviert.',
      'auth/network-request-failed': 'Network error. Please check your connection.'
    };
    return messages[code] || 'Login fehlgeschlagen. Bitte erneut versuchen.';
  }

  /**
   * Validates the form and triggers authenticated login.
   * @returns {void} No return value.
   */
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

  /**
   * Signs in using configured test-user credentials.
   * @returns {void} No return value.
   */
  onGuestLogin(): void {
    this.authService.loginAsTestUser().catch((error) => {
      this.handleFirebaseError(error);
    });
  }

  /**
   * Resets login form fields to empty values.
   * @returns {void} No return value.
   */
  resetForm(): void {
    this.email = '';
    this.password = '';
  }
}
