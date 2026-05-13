import { IntroAnimationConfig } from './intro-animation-config.model';
import { measureIntroTarget } from './intro-target-position';

export const introConfigMobileGuest: IntroAnimationConfig = {
  mode: 'mobile',
  authenticated: false,
  containerClass: 'intro-mobile-guest',
  logoSrc: 'assets/img/login/joindarkmobilewhite.png',
  logoAlt: 'Join Logo Mobile',
  redirectDelayMs: 3000,
  animationDurationMs: 3000,
  easingFunction: 'linear',
  backgroundColor: '#2a3647',
  endPosition: () => measureIntroTarget('.login-page .logo-img'),
};
