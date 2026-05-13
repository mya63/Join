import { IntroAnimationConfig } from './intro-animation-config.model';

export const introConfigDesktopAuth: IntroAnimationConfig = {
  mode: 'desktop',
  authenticated: true,
  containerClass: 'intro-desktop-auth',
  logoSrc: 'assets/img/login/signup/joindark.png',
  logoAlt: 'Join Logo',
  redirectDelayMs: 2400,
};
