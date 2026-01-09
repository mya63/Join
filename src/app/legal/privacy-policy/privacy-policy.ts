import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthFooterNav } from '../../login/auth-footer-nav/auth-footer-nav';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, AuthFooterNav],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
})
export class PrivacyPolicy {

}
