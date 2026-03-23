import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FbAuthService } from '../../services/fb-auth-service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp {
  constructor(private router: Router, private authService: FbAuthService) {}

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
    firebase: '',  // Neu für Firebase-Fehler
  };

  private resetErrors(): void {
    for (const key in this.signUpErrors) {
      this.signUpErrors[key] = '';
    }
  }

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
    if (!/^[A-ZÄÖÜ][a-zäöüß]+(?: [A-ZÄÖÜ][a-zäöüß]+)*$/.test(name)) {
      this.signUpErrors.name = 'Please start with a capital letter.';
    }
  }

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
    if (!/^[A-ZÄÖÜ][a-zäöüß]+(?: [A-ZÄÖÜ][a-zäöüß]+)*$/.test(surname)) {
      this.signUpErrors.surname = 'Please start with a capital letter.';
    }
  }

  private validateEmail(): void {
    const email = this.signUpData.email.trim();
    this.signUpErrors.email = '';
    if (!email) {
      this.signUpErrors.email = 'Please enter your email.';
      return;
    }
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(email)) {
      this.signUpErrors.email = 'Please enter a valid email address.';
    }
  }

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

  private validatePrivacy(): void {
    this.signUpErrors.privacy = '';
    if (!this.signUpData.acceptPrivacy) {
      this.signUpErrors.privacy = 'Please accept the Privacy Policy.';
    }
  }

  private hasErrors(): boolean {
    for (const key in this.signUpErrors) {
      if (this.signUpErrors[key]) {
        return true;
      }
    }
    return false;
  }

  private handleFirebaseError(error: any): void {
    console.error('Sign-up failed:', error);
    switch (error.code) {
      case 'auth/email-already-in-use':
        this.signUpErrors.firebase = 'This email is already registered.';
        break;
      case 'auth/weak-password':
        this.signUpErrors.firebase = 'Password should be at least 6 characters.';
        break;
      case 'auth/invalid-email':
        this.signUpErrors.firebase = 'Please enter a valid email address.';
        break;
      case 'auth/network-request-failed':
        this.signUpErrors.firebase = 'Network error. Please check your connection.';
        break;
      default:
        this.signUpErrors.firebase = 'An error occurred during sign-up. Please try again.';
    }
  }

  onSubmit(): void {
    this.resetErrors();
    this.validateName();
    this.validateSurname();
    this.validateEmail();
    this.validatePassword();
    this.validateConfirmPassword();
    this.validatePrivacy();
    if (this.hasErrors()) {
      return;
    }
    this.authService.signUp(
      this.signUpData.email,
      this.signUpData.password,
      this.signUpData.name,
      this.signUpData.surname
    ).catch(error => {
      this.handleFirebaseError(error);
    });
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
