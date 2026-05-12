import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
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
  protected readonly landsOnSidebar = signal(false);
  protected readonly introReady = signal(false);
  private readonly introDelayMs = 2400;

  /**
   * Resolves startup target and redirects after intro delay.
   * @returns {void} No return value.
   */
  async ngOnInit(): Promise<void> {
    const targetRoute = await this.authService.resolveStartupRoute();
    this.landsOnSidebar.set(targetRoute === '/summary');
    this.introReady.set(true);

    setTimeout(() => {
      this.router.navigate([targetRoute]);
    }, this.introDelayMs);
  }
}

