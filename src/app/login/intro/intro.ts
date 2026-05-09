import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FbAuthService } from '../../services/fb-auth-service';

@Component({
  selector: 'app-intro',
  imports: [],
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Intro {
  private router = inject(Router);
  private authService = inject(FbAuthService);
  /**
   * Resolves startup target and redirects after intro delay.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    setTimeout(() => {
      this.authService.resolveStartupRoute().then((targetRoute) => {
        this.router.navigate([targetRoute]);
      });
    }, 2000);
  }
}

