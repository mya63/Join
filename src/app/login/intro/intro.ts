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
  protected readonly movementVars = signal('');

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
    return `--intro-duration: ${config.animationDurationMs}ms; --intro-ease: ${config.easingFunction}; background: ${config.backgroundColor};`;
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
    return mode === 'desktop'
      ? this.buildDesktopEndVars(target)
      : this.buildMeasuredMovementVars(logoElement.getBoundingClientRect(), target, mode);
  }

  /**
   * Builds desktop end variables from measured target.
   * @param {IntroTargetPosition} target - Measured target position.
   * @returns {string} CSS custom properties for exact desktop end position.
   */
  private buildDesktopEndVars(target: IntroTargetPosition): string {
    const numericTarget = this.getNumericTarget(target);
    if (!numericTarget) return '';
    return ` --intro-end-left-desktop: ${numericTarget.left}px; --intro-end-top-desktop: ${numericTarget.top}px; --intro-end-size-desktop: ${numericTarget.width}px;`;
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
    const deltaX = numericTarget.left - startRect.left;
    const deltaY = numericTarget.top - startRect.top;
    const scale = numericTarget.width / startRect.width;
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
    this.prepareIntroAnimation();
  }

  /**
   * Prepares intro movement after initial paint and then starts the animation.
   * @returns {void} No return value.
   */
  private prepareIntroAnimation(): void {
    requestAnimationFrame(() => {
      this.movementVars.set(this.measureMovementVars());
      requestAnimationFrame(() => {
        this.introReady.set(true);
      });
    });
  }
}

