import { IntroAnimationConfig } from './intro-animation-config.model';
import { measureIntroTarget } from './intro-target-position';

export const introConfigMobileGuest: IntroAnimationConfig = {
  mode: 'mobile',
  authenticated: false,
  containerClass: 'intro-mobile-guest',
  logoSrc: 'assets/img/login/joindarkmobilewhite.png',
  logoAlt: 'Join Logo Mobile',
  redirectDelayMs: 2000,
  animationDurationMs: 2000,
  easingFunction: 'ease-in',
  backgroundColor: '#2a3647',
  targetSelectors: ['.login-page .logo-img'],
  targetRetryFrames: 30,
  hideTargetUntilPercent: 0.99,
  endPosition: () => measureIntroTarget('.login-page .logo-img'),
};
