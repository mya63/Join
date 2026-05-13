import { IntroAnimationConfig } from './intro-animation-config.model';

export const introConfigMobileAuth: IntroAnimationConfig = {
  mode: 'mobile',
  authenticated: true,
  containerClass: 'intro-mobile-auth',
  logoSrc: 'assets/img/login/joindarkmobilewhite.png',
  logoAlt: 'Join Logo Mobile',
  redirectDelayMs: 2400,
  animationDurationMs: 2300,
  easingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  backgroundColor: '#2a3647',
};
