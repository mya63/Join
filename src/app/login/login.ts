import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  constructor(private router: Router) {}

  email: string = '';
  password: string = '';

  loginErrors: { email: string; password: string } = { email: '', password: '' };

  private resetErrors(): void {
    this.loginErrors = { email: '', password: '' };
  }

  goToSignUp(): void {
    this.router.navigate(['sign-up']);
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
this.router.navigate(['contacts']);
  }

  onGuestLogin(): void {
    this.router.navigate(['contacts']);
  }

  resetForm(): void {
    this.email = '';
    this.password = '';
  }
}
