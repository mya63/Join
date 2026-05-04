import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'figma-header',
  imports: [CommonModule],
  templateUrl: './figma-header.html',
  styleUrls: ['./figma-header.scss'],
})
export class FigmaHeader implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);

  userInitials = signal('G');
  dropdownOpen = signal(false);

  ngOnInit() {
    onAuthStateChanged(this.auth, (user) => {
      if (user?.displayName) {
        const parts = user.displayName.trim().split(/\s+/);
        const initials = parts.length >= 2
          ? parts[0][0] + parts[parts.length - 1][0]
          : parts[0].slice(0, 2);
        this.userInitials.set(initials.toUpperCase());
      } else if (user?.email) {
        this.userInitials.set(user.email[0].toUpperCase());
      } else {
        this.userInitials.set('G');
      }
    });
  }

  toggle() { this.dropdownOpen.set(!this.dropdownOpen()); }
  logout() { this.router.navigate(['/login']); }
}
