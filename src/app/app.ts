import { Component, ChangeDetectionStrategy, inject, signal, Injector, runInInjectionContext } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FigmaHeader } from './shared/layout/figma-header/figma-header';
import { FigmaSidenav } from './shared/layout/figma-sidenav/figma-sidenav';
import { FigmaBottomNav } from './shared/layout/figma-bottom-nav/figma-bottom-nav';
import { Location } from '@angular/common';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { FbAuthService } from './services/fb-auth-service';
import { Intro } from './login/intro/intro';
import { IntroAnimationConfig } from './login/intro/intro-animation-config.model';
import { introConfigDesktopGuest } from './login/intro/intro-config-desktop-guest';
import { selectIntroConfig } from './login/intro/intro-config.select';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FigmaHeader, FigmaSidenav, FigmaBottomNav, Intro],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('join2');
  private location = inject(Location);
  private router = inject(Router);
  private auth = inject(Auth);
  private injector = inject(Injector);
  private authService = inject(FbAuthService);
  protected readonly isAuthenticated = signal(!!this.auth.currentUser);
  protected readonly introVisible = signal(false);
  protected readonly introConfig = signal<IntroAnimationConfig>(introConfigDesktopGuest);

  /**
   * Syncs authenticated state with Firebase auth changes.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.initializeStartupOverlay();
    /**
     * Registers the auth-state listener within Angular injection context.
     * @returns {void} No return value.
     */
    runInInjectionContext(this.injector, () => {
      /**
       * Updates local authenticated signal whenever Firebase auth state changes.
       * @param {import('@angular/fire/auth').User | null} user - Current authenticated user.
       * @returns {void} No return value.
       */
      onAuthStateChanged(this.auth, (user) => {
        this.isAuthenticated.set(!!user);
      });
    });
  }

  /**
   * Resolves startup target, navigates immediately, and shows intro as page overlay.
   * @returns {void} No return value.
   */
  private initializeStartupOverlay(): void {
    if (!this.isStartupEntryRoute()) return;
    this.navigateAndAnimateStartup();
  }

  /**
   * Returns whether current location is the bootstrap entry route.
   * @returns {boolean} True when app launched on root path.
   */
  private isStartupEntryRoute(): boolean {
    const currentPath = this.location.path().split('?')[0];
    return currentPath === '' || currentPath === '/';
  }

  /**
   * Returns true when startup animation should use mobile viewport config.
   * @returns {boolean} True when viewport width matches mobile breakpoint.
   */
  private isMobileViewport(): boolean {
    return window.matchMedia('(max-width: 1350px)').matches;
  }

  /**
   * Builds startup overlay config using resolved target route and viewport mode.
   * @param {'/summary' | '/login'} targetRoute - Startup route resolved by auth service.
   * @returns {IntroAnimationConfig} Intro animation config for current startup context.
   */
  private buildStartupIntroConfig(targetRoute: '/summary' | '/login'): IntroAnimationConfig {
    const isAuthenticated = targetRoute === '/summary';
    return selectIntroConfig(this.isMobileViewport(), isAuthenticated);
  }

  /**
   * Runs startup routing first, then overlays intro animation above loaded target page.
   * @returns {Promise<void>} Completes when startup navigation and overlay lifecycle are scheduled.
   */
  private async navigateAndAnimateStartup(): Promise<void> {
    const targetRoute = await this.authService.resolveStartupRoute();
    const config = this.buildStartupIntroConfig(targetRoute);
    await this.router.navigate([targetRoute], { replaceUrl: true });
    this.introConfig.set(config);
    this.introVisible.set(true);
  }

  /**
   * Hides intro overlay when intro component reports playback completion.
   * @returns {void} No return value.
   */
  protected onIntroCompleted(): void {
    this.introVisible.set(false);
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
