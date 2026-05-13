import { IntroAnimationConfig } from './intro-animation-config.model';
import { measureIntroTarget } from './intro-target-position';

export const introConfigDesktopGuest: IntroAnimationConfig = {
  mode: 'desktop',
  authenticated: false,
  containerClass: 'intro-desktop-guest',
  logoSrc: 'assets/img/login/signup/joindark.png',
  logoAlt: 'Join Logo',
  redirectDelayMs: 3000,
  animationDurationMs: 3000,
  easingFunction: 'linear',
  backgroundColor: '#f6f7f8',
  endPosition: () => measureIntroTarget('.login-page .logo-img'),
};
