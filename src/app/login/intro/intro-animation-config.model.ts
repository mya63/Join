import { IntroTargetPosition } from './intro-target-position';

export type IntroViewportMode = 'desktop' | 'mobile';

export interface IntroAnimationConfig {
  readonly mode: IntroViewportMode;
  readonly authenticated: boolean;
  readonly containerClass: string;
  readonly logoSrc: string;
  readonly logoAlt: string;
  readonly redirectDelayMs: number;
  readonly animationDurationMs: number;
  readonly easingFunction: string;
  readonly backgroundColor: string;
  readonly targetSelectors: readonly string[];
  readonly targetRetryFrames: number;
  readonly hideTargetUntilPercent: number | null;
  readonly endPosition?: () => IntroTargetPosition;
}
