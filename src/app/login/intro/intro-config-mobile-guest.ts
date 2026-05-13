import { IntroAnimationConfig } from './intro-animation-config.model';

export const introConfigMobileGuest: IntroAnimationConfig = {
  mode: 'mobile',
  authenticated: false,
  containerClass: 'intro-mobile-guest',
  logoSrc: 'assets/img/login/joindarkmobilewhite.png',
  logoAlt: 'Join Logo Mobile',
  redirectDelayMs: 2400,
};
