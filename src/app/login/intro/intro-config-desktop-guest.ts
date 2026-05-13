import { IntroAnimationConfig } from './intro-animation-config.model';

export const introConfigDesktopGuest: IntroAnimationConfig = {
  mode: 'desktop',
  authenticated: false,
  containerClass: 'intro-desktop-guest',
  logoSrc: 'assets/img/login/signup/joindark.png',
  logoAlt: 'Join Logo',
  redirectDelayMs: 2400,
  animationDurationMs: 2300,
  easingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  backgroundColor: '#f6f7f8',
};
