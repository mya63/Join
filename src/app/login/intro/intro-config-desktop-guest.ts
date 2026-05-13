import { IntroAnimationConfig } from './intro-animation-config.model';

export const introConfigDesktopGuest: IntroAnimationConfig = {
  mode: 'desktop',
  authenticated: false,
  containerClass: 'intro-desktop-guest',
  logoSrc: 'assets/img/login/signup/joindark.png',
  logoAlt: 'Join Logo',
  redirectDelayMs: 2400,
};
