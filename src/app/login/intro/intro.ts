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
  readonly animationConfig = input.required<IntroAnimationConfig>();
  protected readonly introReady = signal(false);

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
    return this.buildIntroStyles(this.animationConfig(), 274, 'desktop');
  }

  /**
   * Builds mobile inline styles from selected configuration animation parameters.
   * @returns {string} Inline style declaration with CSS custom properties.
   */
  protected getMobileStyles(): string {
    return this.buildIntroStyles(this.animationConfig(), 180, 'mobile');
  }

  /**
   * Builds inline intro styles with dynamic movement variables.
   * @param {IntroAnimationConfig} config - Active intro animation configuration.
   * @param {number} startSize - Initial rendered logo width.
   * @param {'desktop' | 'mobile'} mode - Intro viewport mode.
   * @returns {string} Inline style declaration with CSS custom properties.
   */
  private buildIntroStyles(config: IntroAnimationConfig, startSize: number, mode: 'desktop' | 'mobile'): string {
    const movementVars = this.buildMovementVars(config.endPosition?.(), startSize, mode);
    return `--intro-duration: ${config.animationDurationMs}ms; --intro-ease: ${config.easingFunction}; background: ${config.backgroundColor};${movementVars}`;
  }

  /**
   * Builds transform movement variables for the selected viewport mode.
   * @param {IntroTargetPosition | undefined} target - Measured target position.
   * @param {number} startSize - Initial rendered logo width.
   * @param {'desktop' | 'mobile'} mode - Intro viewport mode.
   * @returns {string} CSS custom properties for translation and scaling.
   */
  private buildMovementVars(target: IntroTargetPosition | undefined, startSize: number, mode: 'desktop' | 'mobile'): string {
    const numericTarget = this.getNumericTarget(target);
    if (!numericTarget) return '';
    const deltaX = this.getTargetCenterX(numericTarget) - window.innerWidth / 2;
    const deltaY = this.getTargetCenterY(numericTarget) - window.innerHeight / 2;
    const scale = numericTarget.width / startSize;
    return this.formatMovementVars(mode, deltaX, deltaY, scale);
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
    return { left, top, width, height };
  }

  /**
   * Returns the horizontal center of the target rectangle.
   * @param {{ left: number; top: number; width: number; height: number; }} target - Parsed target rectangle.
   * @returns {number} Horizontal center in pixels.
   */
  private getTargetCenterX(target: { left: number; top: number; width: number; height: number; }): number {
    return target.left + target.width / 2;
  }

  /**
   * Returns the vertical center of the target rectangle.
   * @param {{ left: number; top: number; width: number; height: number; }} target - Parsed target rectangle.
   * @returns {number} Vertical center in pixels.
   */
  private getTargetCenterY(target: { left: number; top: number; width: number; height: number; }): number {
    return target.top + target.height / 2;
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
    this.armIntroOnNextFrame();
  }

  /**
   * Starts intro animation after initial paint to avoid first-frame stutter.
   * @returns {void} No return value.
   */
  private armIntroOnNextFrame(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.introReady.set(true);
      });
    });
  }
}

