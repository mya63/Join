import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FbAuthService } from '../../services/fb-auth-service';

@Component({
  selector: 'app-sign-up',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUp {
  private router = inject(Router);
  private authService = inject(FbAuthService);
  private cdr = inject(ChangeDetectorRef);
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

  signUpData = {
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptPrivacy: false,
  };

  signUpErrors: any = {
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: '',
    privacy: '',
    firebase: '',
  };

  /**
   * Clears all sign-up validation and backend error messages.
   * @returns {void} No return value.
   */
  private resetErrors(): void {
    for (const key in this.signUpErrors) {
      this.signUpErrors[key] = '';
    }
  }

  /**
   * Validates the first-name input and updates error state.
   * @returns {void} No return value.
   */
  private validateName(): void {
    const name = this.signUpData.name.trim();
    this.signUpErrors.name = '';
    if (!name) {
      this.signUpErrors.name = 'Please enter your name.';
      return;
    }
    if (name.length < 2) {
      this.signUpErrors.name = 'Name is too short.';
      return;
    }
    if (!/^[A-ZÄÖÜa-zäöüß\-\.\s]+$/.test(name)) {
      this.signUpErrors.name = 'Invalid characters. Only letters, hyphens, dots, and spaces are allowed.';
      return;
    }
    if (!/^[A-ZÄÖÜ]/.test(name)) {
      this.signUpErrors.name = 'Please start with a capital letter.';
    }
  }

  /**
   * Validates the surname input and updates error state.
   * @returns {void} No return value.
   */
  private validateSurname(): void {
    const surname = this.signUpData.surname.trim();
    this.signUpErrors.surname = '';
    if (!surname) {
      this.signUpErrors.surname = 'Please enter your surname.';
      return;
    }
    if (surname.length < 2) {
      this.signUpErrors.surname = 'Surname is too short.';
      return;
    }
    if (!/^[A-ZÄÖÜa-zäöüß\-\.\s]+$/.test(surname)) {
      this.signUpErrors.surname = 'Invalid characters. Only letters, hyphens, dots, and spaces are allowed.';
      return;
    }
    if (!/^[A-ZÄÖÜ]/.test(surname)) {
      this.signUpErrors.surname = 'Please start with a capital letter.';
    }
  }

  /**
   * Performs live first-name validation while typing.
   * @returns {void} No return value.
   */
  onNameInput(): void {
    const name = this.signUpData.name.trim();
    if (!name) {
      this.signUpErrors.name = '';
      return;
    }
    if (!/^[A-ZÄÖÜa-zäöüß\-\.\s]+$/.test(name)) {
      this.signUpErrors.name = 'Invalid characters. Only letters, hyphens, dots, and spaces are allowed.';
      return;
    }
    this.signUpErrors.name = /^[A-ZÄÖÜ]/.test(name) ? '' : 'Please start with a capital letter.';
  }

  /**
   * Performs live surname validation while typing.
   * @returns {void} No return value.
   */
  onSurnameInput(): void {
    const surname = this.signUpData.surname.trim();
    if (!surname) {
      this.signUpErrors.surname = '';
      return;
    }
    if (!/^[A-ZÄÖÜa-zäöüß\-\.\s]+$/.test(surname)) {
      this.signUpErrors.surname = 'Invalid characters. Only letters, hyphens, dots, and spaces are allowed.';
      return;
    }
    this.signUpErrors.surname = /^[A-ZÄÖÜ]/.test(surname)
      ? ''
      : 'Please start with a capital letter.';
  }

  /**
   * Validates email format and updates error state.
   * @returns {void} No return value.
   */
  private validateEmail(): void {
    const email = this.signUpData.email.trim();
    this.signUpErrors.email = '';
    if (!email) {
      this.signUpErrors.email = 'Please enter your email.';
      return;
    }
    if (!this.emailPattern.test(email)) {
      this.signUpErrors.email = 'Please enter a valid email address.';
    }
  }

  /**
   * Performs live email validation while typing.
   * @returns {void} No return value.
   */
  onEmailInput(): void {
    const email = this.signUpData.email.trim();
    if (!email) {
      this.signUpErrors.email = '';
      return;
    }
    this.signUpErrors.email = this.emailPattern.test(email)
      ? ''
      : 'Please enter a valid email address.';
  }

  /**
   * Validates password requirements for sign-up.
   * @returns {void} No return value.
   */
  private validatePassword(): void {
    const password = this.signUpData.password;
    this.signUpErrors.password = '';
    if (!password) {
      this.signUpErrors.password = 'Please enter your password.';
      return;
    }
    if (password.length < 6) {
      this.signUpErrors.password = 'Password must be at least 6 characters.';
    }
  }

  /**
   * Validates whether confirmation password matches the original password.
   * @returns {void} No return value.
   */
  private validateConfirmPassword(): void {
    const confirm = this.signUpData.confirmPassword;
    this.signUpErrors.confirmPassword = '';
    if (!confirm) {
      this.signUpErrors.confirmPassword = 'Please confirm your password.';
      return;
    }
    if (confirm !== this.signUpData.password) {
      this.signUpErrors.confirmPassword = 'Your passwords do not match.';
    }
  }

  /**
   * Validates whether privacy policy consent is checked.
   * @returns {void} No return value.
   */
  private validatePrivacy(): void {
    this.signUpErrors.privacy = '';
    if (!this.signUpData.acceptPrivacy) {
      this.signUpErrors.privacy = 'Please accept the Privacy Policy.';
    }
  }

  /**
   * Checks whether any validation or backend error is currently present.
   * @returns {boolean} True when at least one error field is non-empty.
   */
  private hasErrors(): boolean {
    for (const key in this.signUpErrors) {
      if (this.signUpErrors[key]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Maps Firebase sign-up errors to user-friendly UI messages.
   * @param {any} error - Firebase auth error payload.
   * @returns {void} No return value.
   */
  private handleFirebaseError(error: any): void {
    console.error('Sign-up failed:', error);
    const code = String(error?.code || '');
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/network-request-failed': 'Network error. Please check your connection.'
    };
    this.signUpErrors.firebase = messages[code] || 'An error occurred during sign-up. Please try again.';
  }

  /**
   * Validates all fields, checks email uniqueness, and creates a new account.
   * @returns {Promise<void>} Promise resolved after submit flow finishes.
   */
  async onSubmit(): Promise<void> {
    this.resetErrors();
    this.validateName();
    this.validateSurname();
    this.validateEmail();
    this.validatePassword();
    this.validateConfirmPassword();
    this.validatePrivacy();
    if (this.hasErrors()) return;
    await this.checkEmailAndSubmit();
  }

  /**
   * Checks whether the email is already registered and triggers account creation when not.
   * @returns {Promise<void>} Promise resolved after the email check and optional sign-up completes.
   */
  private async checkEmailAndSubmit(): Promise<void> {
    const alreadyRegistered = await this.authService.isEmailRegistered(this.signUpData.email);
    if (alreadyRegistered) {
      this.signUpErrors.email = 'This email address is already registered.';
      this.cdr.markForCheck();
      return;
    }

    this.authService.signUp(
      this.signUpData.email,
      this.signUpData.password,
      this.signUpData.name.trim(),
      this.signUpData.surname.trim()
    ).catch(error => {
      this.handleFirebaseError(error);
      this.cdr.markForCheck();
    });
  }

  /**
   * Navigates back to the login page.
   * @returns {void} No return value.
   */
  goBack(): void {
    this.router.navigate(['/login']);
  }
}
