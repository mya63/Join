import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { IntroAnimationConfig } from './intro-animation-config.model';

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
    const config = this.animationConfig();
    return `--intro-duration: ${config.animationDurationMs}ms; --intro-ease: ${config.easingFunction}; background: ${config.backgroundColor};`;
  }

  /**
   * Builds mobile inline styles from selected configuration animation parameters.
   * @returns {string} Inline style declaration with CSS custom properties.
   */
  protected getMobileStyles(): string {
    const config = this.animationConfig();
    return `--intro-duration: ${config.animationDurationMs}ms; --intro-ease: ${config.easingFunction}; background: ${config.backgroundColor};`;
  }

  /**
   * Arms intro animation playback once overlay is mounted.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.introReady.set(true);
  }
}

