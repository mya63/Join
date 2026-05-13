import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { IntroAnimationConfig } from './intro-animation-config.model';
import { IntroTargetPosition } from './intro-target-position';

@Component({
  selector: 'app-intro',
  imports: [],
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Intro {
  private readonly centerHoldMs = 140;
  private readonly introHiddenClass = 'intro-target-hidden';
  private readonly introBodyHideClass = 'intro-hide-target-logo';
  private introMountedAtMs = 0;
  private hiddenTargetLogos: HTMLElement[] = [];
  readonly animationConfig = input.required<IntroAnimationConfig>();
  protected readonly introReady = signal(false);
  protected readonly movementVars = signal('');
  protected readonly moveDurationMs = signal<number | null>(null);

  /**
   * Builds desktop wrapper classes from selected configuration and animation readiness.
   * @returns {string} Desktop class list for the intro wrapper.
   */
  protected getDesktopClasses(): string {
    const readyClass = this.introReady() ? ' ready' : '';
    return `intro-container ${this.animationConfig().containerClass}${readyClass}`;
  }

  /**
   * Builds mobile wrapper classes from selected configuration and animation readiness.
   * @returns {string} Mobile class list for the intro wrapper.
   */
  protected getMobileClasses(): string {
    const readyClass = this.introReady() ? ' ready' : '';
    return `intro-mobile ${this.animationConfig().containerClass}${readyClass}`;
  }

  /**
   * Builds desktop inline styles from selected configuration animation parameters.
   * @returns {string} Inline style declaration with CSS custom properties.
   */
  protected getDesktopStyles(): string {
    return this.buildBaseStyles(this.animationConfig()) + this.movementVars();
  }

  /**
   * Builds mobile inline styles from selected configuration animation parameters.
   * @returns {string} Inline style declaration with CSS custom properties.
   */
  protected getMobileStyles(): string {
    return this.buildBaseStyles(this.animationConfig()) + this.movementVars();
  }

  /**
   * Builds static intro styles from the active configuration.
   * @param {IntroAnimationConfig} config - Active intro animation configuration.
   * @returns {string} Inline style declaration without movement variables.
   */
  private buildBaseStyles(config: IntroAnimationConfig): string {
    const moveDurationMs = this.moveDurationMs() ?? config.animationDurationMs;
    return `--intro-duration: ${moveDurationMs}ms; --intro-ease: ${config.easingFunction}; --intro-bg: ${config.backgroundColor};`;
  }

  /**
   * Returns movement runtime after reserving the center-hold phase.
   * @param {number} totalDurationMs - Full intro runtime from configuration.
   * @returns {number} Effective movement runtime in milliseconds.
   */
  private getMoveDurationMs(totalDurationMs: number, elapsedMs: number): number {
    return Math.max(0, totalDurationMs - elapsedMs);
  }

  /**
   * Measures movement variables from the rendered intro logo to the rendered target.
   * @returns {string} CSS custom properties for translation and scaling.
   */
  private measureMovementVars(): string {
    const logoElement = this.getIntroLogoElement();
    const target = this.animationConfig().endPosition?.();
    if (!logoElement || !target) return '';
    const mode = this.animationConfig().mode;
    return this.buildMeasuredMovementVars(logoElement.getBoundingClientRect(), target, mode);
  }

  /**
   * Returns the active intro logo element for the current viewport mode.
   * @returns {HTMLImageElement | null} Mounted intro logo element.
   */
  private getIntroLogoElement(): HTMLImageElement | null {
    const selector = this.animationConfig().mode === 'desktop' ? '.intro-logo-shell' : '.intro-logo-shell-m';
    return document.querySelector<HTMLImageElement>(selector);
  }

  /**
   * Builds movement variables from actual rendered rectangles.
   * @param {DOMRect} startRect - Current intro logo rectangle.
   * @param {IntroTargetPosition} target - Measured target position.
   * @param {'desktop' | 'mobile'} mode - Active intro viewport mode.
   * @returns {string} CSS custom properties for exact logo alignment.
   */
  private buildMeasuredMovementVars(startRect: DOMRect, target: IntroTargetPosition, mode: 'desktop' | 'mobile'): string {
    const numericTarget = this.getNumericTarget(target);
    if (!numericTarget) return '';
    const rawDeltaX = numericTarget.left - startRect.left;
    const rawDeltaY = numericTarget.top - startRect.top;
    const deltaX = this.snapToDevicePixel(rawDeltaX);
    const deltaY = this.snapToDevicePixel(rawDeltaY);
    const scale = numericTarget.width / startRect.width;
    return this.formatMovementVars(mode, deltaX, deltaY, scale);
  }

  /**
   * Snaps values to device-pixel boundaries for sharper endpoint placement.
   * @param {number} value - Raw movement delta value.
   * @returns {number} Device-pixel-aligned value.
   */
  private snapToDevicePixel(value: number): number {
    const dpr = window.devicePixelRatio || 1;
    return Math.round(value * dpr) / dpr;
  }

  /**
   * Parses numeric movement values from a measured target.
   * @param {IntroTargetPosition | undefined} target - Measured target position.
   * @returns {{ left: number; top: number; width: number; height: number; } | null} Parsed target values.
   */
  private getNumericTarget(target: IntroTargetPosition | undefined): { left: number; top: number; width: number; height: number; } | null {
    if (!target) return null;
    const left = Number.parseFloat(target.x);
    const top = Number.parseFloat(target.y);
    const width = Number.parseFloat(target.width);
    const height = Number.parseFloat(target.height);
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (width <= 0 || height <= 0) return null;
    return { left, top, width, height };
  }

  /**
   * Formats CSS custom properties for movement and scaling.
   * @param {'desktop' | 'mobile'} mode - Intro viewport mode.
   * @param {number} deltaX - Horizontal movement from center.
   * @param {number} deltaY - Vertical movement from center.
   * @param {number} scale - Final logo scale factor.
   * @returns {string} CSS variables used by keyframes.
   */
  private formatMovementVars(mode: 'desktop' | 'mobile', deltaX: number, deltaY: number, scale: number): string {
    return ` --intro-dx-${mode}: ${deltaX}px; --intro-dy-${mode}: ${deltaY}px; --intro-scale-${mode}: ${scale};`;
  }

  /**
   * Arms intro animation playback once overlay is mounted.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.introMountedAtMs = performance.now();
    document.body.classList.add(this.introBodyHideClass);
    this.prepareIntroAnimation();
    this.hiddenTargetLogos = this.hideTargetLogosForIntro();
  }

  /**
   * Prepares intro movement after initial paint and then starts the animation.
   * @returns {void} No return value.
   */
  private prepareIntroAnimation(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.startIntroAfterCenterHold();
      });
    });
  }

  /**
   * Starts intro after a short guaranteed center hold.
   * @returns {void} No return value.
   */
  private startIntroAfterCenterHold(): void {
    setTimeout(() => {
      this.startIntroWhenTargetIsReady(240);
    }, this.centerHoldMs);
  }

  /**
   * Waits for a valid measured target and then starts intro playback.
   * @param {number} attemptsLeft - Remaining animation-frame retries.
   * @returns {void} No return value.
   */
  private startIntroWhenTargetIsReady(attemptsLeft: number): void {
    const vars = this.measureMovementVars();
    if (vars || attemptsLeft <= 0) {
      const durationMs = this.animationConfig().animationDurationMs;
      this.moveDurationMs.set(durationMs);
      this.movementVars.set(vars);
      this.startIntroPlayback(durationMs);
      return;
    }
    requestAnimationFrame(() => this.startIntroWhenTargetIsReady(attemptsLeft - 1));
  }

  /**
   * Starts the intro animation and schedules login-logo restoration.
   * @param {number} durationMs - Effective intro animation duration.
   * @returns {void} No return value.
   */
  private startIntroPlayback(durationMs: number): void {
    requestAnimationFrame(() => {
      this.introReady.set(true);
    });
    this.restoreTargetLogosNearIntroEnd(durationMs);
  }

  /**
   * Hides target logo elements used as intro endpoints.
   * @returns {HTMLElement[]} Hidden logo elements for later restoration.
   */
  private hideTargetLogosForIntro(): HTMLElement[] {
    const containerClass = this.animationConfig().containerClass;
    const selectors = this.getTargetLogoSelectors(containerClass);
    const elements = selectors
      .map((selector) => document.querySelector(selector) as HTMLElement | null)
      .filter((element): element is HTMLElement => !!element);
    elements.forEach((element) => element.classList.add(this.introHiddenClass));
    return elements;
  }

  /**
   * Resolves target logo selectors by intro variant.
   * @param {string} containerClass - Active intro container class.
   * @returns {string[]} Target selectors for the current intro variant.
   */
  private getTargetLogoSelectors(containerClass: string): string[] {
    if (containerClass === 'intro-desktop-auth') return ['.figma-sidenav .logo-img'];
    if (containerClass === 'intro-mobile-auth') return ['.mobile-only .j-logo', '.login-page .logo-img'];
    return ['.login-page .logo-img'];
  }

  /**
   * Restores hidden target logos near the end of intro animation.
   * @param {number} durationMs - Effective intro animation duration.
   * @returns {void} No return value.
   */
  private restoreTargetLogosNearIntroEnd(durationMs: number): void {
    setTimeout(() => {
      this.hiddenTargetLogos.forEach((element) => element.classList.remove(this.introHiddenClass));
      this.hiddenTargetLogos = [];
      document.body.classList.remove(this.introBodyHideClass);
    }, Math.floor(durationMs * 0.99));
  }
}

