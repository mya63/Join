import { Component, ChangeDetectionStrategy, inject, signal, Injector, runInInjectionContext } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FigmaHeader } from './shared/layout/figma-header/figma-header';
import { FigmaSidenav } from './shared/layout/figma-sidenav/figma-sidenav';
import { FigmaBottomNav } from './shared/layout/figma-bottom-nav/figma-bottom-nav';
import { Location } from '@angular/common';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FigmaHeader, FigmaSidenav, FigmaBottomNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('join2');
  private location = inject(Location);
  private auth = inject(Auth);
  private injector = inject(Injector);
  protected readonly isAuthenticated = signal(!!this.auth.currentUser);

  /**
   * Syncs authenticated state with Firebase auth changes.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, (user) => {
        this.isAuthenticated.set(!!user);
      });
    });
  }

  /**
   * Determines whether shell navigation should be shown on the current route.
   * @returns {boolean} True when app shell navigation should be visible.
   */
  goOn() {
    const currentPath = this.location.path().split('?')[0];
    const publicRoutes = ["", "/", "/login", "/sign-up"];
    const authSensitiveRoutes = ["/privacy-policy", "/legal-notice", "/help"];
    const goOn = publicRoutes.includes(currentPath) ||
      (!this.isAuthenticated() && authSensitiveRoutes.includes(currentPath));
    return goOn;
  };

}
