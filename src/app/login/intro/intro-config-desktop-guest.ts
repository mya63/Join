import { IntroAnimationConfig } from './intro-animation-config.model';
import { measureIntroTarget } from './intro-target-position';

export const introConfigDesktopGuest: IntroAnimationConfig = {
  mode: 'desktop',
  authenticated: false,
  containerClass: 'intro-desktop-guest',
  logoSrc: 'assets/img/login/signup/joindark.png',
  logoAlt: 'Join Logo',
  redirectDelayMs: 2000,
  animationDurationMs: 2000,
  easingFunction: 'ease-in',
  backgroundColor: '#f6f7f8',
  targetSelectors: ['.login-page .logo-img'],
  targetRetryFrames: 30,
  hideTargetUntilPercent: 0.99,
  endPosition: () => measureIntroTarget('.login-page .logo-img'),
};
