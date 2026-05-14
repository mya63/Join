import { Component, ChangeDetectionStrategy, ElementRef, OnDestroy, inject, input, output, signal } from '@angular/core';
import { IntroAnimationConfig } from './intro-animation-config.model';
import { IntroTargetPosition } from './intro-target-position';

@Component({
  selector: 'app-intro',
  imports: [],
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Intro implements OnDestroy {
  private readonly centerHoldMs = 140;
  private readonly introHiddenClass = 'intro-target-hidden';
  private readonly introBodyHideClass = 'intro-hide-target-logo';
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private introMountedAtMs = 0;
  private hiddenTargetLogos: HTMLElement[] = [];
  private centerHoldTimeoutId: number | null = null;
  private restoreTimeoutId: number | null = null;
  private completionTimeoutId: number | null = null;
  private retryRafId: number | null = null;
  private playbackRafId: number | null = null;
  private destroyed = false;
  readonly animationConfig = input.required<IntroAnimationConfig>();
  readonly completed = output<void>();
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
    const target = this.measureTargetPosition();
    if (!target) return '';
    const mode = this.animationConfig().mode;
    const startRect = logoElement?.getBoundingClientRect() ?? this.getVirtualStartRect(mode);
    if (!startRect) return '';
    return this.buildMeasuredMovementVars(startRect, target, mode);
  }

  /**
   * Returns a virtual centered start rectangle when logo element is not measurable.
   * @param {'desktop' | 'mobile'} mode - Active intro viewport mode.
   * @returns {DOMRect | null} Virtual start rectangle for movement calculation.
   */
  private getVirtualStartRect(mode: 'desktop' | 'mobile'): DOMRect | null {
    const size = mode === 'mobile' ? 180 : 274;
    const left = (window.innerWidth / 2) - (size / 2);
    const top = (window.innerHeight / 2) - (size / 2);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
    return new DOMRect(left, top, size, size);
  }

  /**
   * Measures the current intro target using configured selector priority.
   * @returns {IntroTargetPosition | undefined} Measured target or undefined when not available.
   */
  private measureTargetPosition(): IntroTargetPosition | undefined {
    const primary = this.animationConfig().endPosition?.();
    if (this.isValidTargetPosition(primary)) return primary;
    const selectors = this.animationConfig().targetSelectors;
    return this.measureFirstVisibleTarget(selectors);
  }

  /**
   * Returns whether a measured target position contains usable geometry.
   * @param {IntroTargetPosition | undefined} target - Candidate target position.
   * @returns {boolean} True when target position is valid for movement.
   */
  private isValidTargetPosition(target: IntroTargetPosition | undefined): boolean {
    return this.getNumericTarget(target) !== null;
  }

  /**
   * Measures the first visible target element from selector order.
   * @param {readonly string[]} selectors - Ordered target selectors.
   * @returns {IntroTargetPosition | undefined} Measured target or undefined.
   */
  private measureFirstVisibleTarget(selectors: readonly string[]): IntroTargetPosition | undefined {
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      return { x: `${rect.left}px`, y: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` };
    }
    return undefined;
  }

  /**
   * Returns the active intro logo element for the current viewport mode.
   * @returns {HTMLImageElement | null} Mounted intro logo element.
   */
  private getIntroLogoElement(): HTMLImageElement | null {
    const selector = this.animationConfig().mode === 'desktop' ? '.intro-logo-shell' : '.intro-logo-shell-m';
    return this.hostElement.nativeElement.querySelector(selector) as HTMLImageElement | null;
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
    if (this.isTargetHideEnabled()) {
      document.body.classList.add(this.introBodyHideClass);
    }
    this.prepareIntroAnimation();
    this.hiddenTargetLogos = this.hideTargetLogosForIntro();
  }

  /**
   * Cleans up scheduled callbacks when intro is destroyed.
   * @returns {void} No return value.
   */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearTimeoutIfSet(this.centerHoldTimeoutId);
    this.clearTimeoutIfSet(this.restoreTimeoutId);
    this.clearTimeoutIfSet(this.completionTimeoutId);
    this.clearRafIfSet(this.retryRafId);
    this.clearRafIfSet(this.playbackRafId);
    document.body.classList.remove(this.introBodyHideClass);
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
    this.centerHoldTimeoutId = window.setTimeout(() => {
      if (this.destroyed) return;
      this.startIntroWhenTargetIsReady(this.animationConfig().targetRetryFrames);
    }, this.centerHoldMs);
  }

  /**
   * Waits for a valid measured target and then starts intro playback.
   * @param {number} attemptsLeft - Remaining animation-frame retries.
   * @returns {void} No return value.
   */
  private startIntroWhenTargetIsReady(attemptsLeft: number): void {
    if (this.destroyed) return;
    const vars = this.measureMovementVars();
    if (vars || attemptsLeft <= 0) {
      const durationMs = this.animationConfig().animationDurationMs;
      this.moveDurationMs.set(durationMs);
      this.movementVars.set(vars);
      this.startIntroPlayback(durationMs);
      return;
    }
    this.retryRafId = requestAnimationFrame(() => this.startIntroWhenTargetIsReady(attemptsLeft - 1));
  }

  /**
   * Starts the intro animation and schedules login-logo restoration.
   * @param {number} durationMs - Effective intro animation duration.
   * @returns {void} No return value.
   */
  private startIntroPlayback(durationMs: number): void {
    this.playbackRafId = requestAnimationFrame(() => {
      if (this.destroyed) return;
      this.introReady.set(true);
    });
    this.restoreTargetLogosNearIntroEnd(durationMs);
    this.emitCompletionAfterPlayback(durationMs);
  }

  /**
   * Emits intro completion after full animation playback finished.
   * @param {number} durationMs - Effective intro animation duration.
   * @returns {void} No return value.
   */
  private emitCompletionAfterPlayback(durationMs: number): void {
    this.completionTimeoutId = window.setTimeout(() => {
      if (this.destroyed) return;
      this.completed.emit();
    }, durationMs);
  }

  /**
   * Hides target logo elements used as intro endpoints.
   * @returns {HTMLElement[]} Hidden logo elements for later restoration.
   */
  private hideTargetLogosForIntro(): HTMLElement[] {
    if (!this.isTargetHideEnabled()) return [];
    const selectors = this.animationConfig().targetSelectors;
    const elements = selectors
      .map((selector) => document.querySelector(selector) as HTMLElement | null)
      .filter((element): element is HTMLElement => !!element);
    elements.forEach((element) => element.classList.add(this.introHiddenClass));
    return elements;
  }

  /**
   * Returns whether target logos should be hidden until near playback end.
   * @returns {boolean} True when temporary target-logo hiding is enabled.
   */
  private isTargetHideEnabled(): boolean {
    const percent = this.animationConfig().hideTargetUntilPercent;
    return percent !== null && percent > 0;
  }

  /**
   * Restores hidden target logos near the end of intro animation.
   * @param {number} durationMs - Effective intro animation duration.
   * @returns {void} No return value.
   */
  private restoreTargetLogosNearIntroEnd(durationMs: number): void {
    const percent = this.animationConfig().hideTargetUntilPercent;
    if (percent === null) return;
    this.restoreTimeoutId = window.setTimeout(() => {
      if (this.destroyed) return;
      this.hiddenTargetLogos.forEach((element) => element.classList.remove(this.introHiddenClass));
      this.hiddenTargetLogos = [];
      document.body.classList.remove(this.introBodyHideClass);
    }, Math.floor(durationMs * percent));
  }

  /**
   * Clears a timeout if one is currently scheduled.
   * @param {number | null} timeoutId - Window timeout identifier.
   * @returns {void} No return value.
   */
  private clearTimeoutIfSet(timeoutId: number | null): void {
    if (timeoutId === null) return;
    clearTimeout(timeoutId);
  }

  /**
   * Cancels a scheduled animation frame callback if present.
   * @param {number | null} rafId - requestAnimationFrame identifier.
   * @returns {void} No return value.
   */
  private clearRafIfSet(rafId: number | null): void {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
  }
}

