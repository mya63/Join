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
  easingFunction: 'linear',
  backgroundColor: '#f6f7f8',
  endPosition: () => measureIntroTarget('.login-page .logo-img'),
};
