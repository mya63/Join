import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FbAuthService } from '../services/fb-auth-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  constructor(private router: Router, private authService: FbAuthService) {}

  email: string = '';
  password: string = '';

  loginErrors: { email: string; password: string; firebase: string } = { email: '', password: '', firebase: '' };

  private resetErrors(): void {
    this.loginErrors = { email: '', password: '', firebase: '' };
  }

  goToSignUp(): void {
    this.router.navigate(['sign-up']);
  }

  private handleFirebaseError(error: any): void {
    console.error('Login failed:', error);
    switch (error.code) {
      case 'auth/user-not-found':
        this.loginErrors.firebase = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        this.loginErrors.firebase = 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        this.loginErrors.firebase = 'Please enter a valid email address.';
        break;
      case 'auth/user-disabled':
        this.loginErrors.firebase = 'This account has been disabled.';
        break;
      case 'auth/network-request-failed':
        this.loginErrors.firebase = 'Network error. Please check your connection.';
        break;
      default:
        this.loginErrors.firebase = 'Login failed. Please try again.';
    }
  }

  onSubmit(): void {
this.resetErrors();

if (!this.email) {
  this.loginErrors.email = 'Please enter your email.';
}
if (!this.password) {
  this.loginErrors.password = 'Please enter your password.';
}
if (this.loginErrors.email || this.loginErrors.password) {
  return;
}
this.authService.login(this.email, this.password).catch(error => {
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
