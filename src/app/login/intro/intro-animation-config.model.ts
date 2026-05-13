export type IntroViewportMode = 'desktop' | 'mobile';

export interface IntroAnimationConfig {
  readonly mode: IntroViewportMode;
  readonly authenticated: boolean;
  readonly containerClass: string;
  readonly logoSrc: string;
  readonly logoAlt: string;
  readonly redirectDelayMs: number;
}
