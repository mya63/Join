import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthFooterNav } from '../../login/auth-footer-nav/auth-footer-nav';

@Component({
  selector: 'app-legal-notce',
  standalone: true,
  imports: [CommonModule, AuthFooterNav],
  templateUrl: './legal-notice.html',
  styleUrl: './legal-notice.scss',
})
export class LegalNotice {

}
