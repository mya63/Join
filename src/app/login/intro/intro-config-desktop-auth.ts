import { IntroAnimationConfig } from './intro-animation-config.model';
import { measureIntroTarget } from './intro-target-position';

export const introConfigDesktopAuth: IntroAnimationConfig = {
  mode: 'desktop',
  authenticated: true,
  containerClass: 'intro-desktop-auth',
  logoSrc: 'assets/img/login/signup/joindark.png',
  logoAlt: 'Join Logo',
  redirectDelayMs: 2000,
  animationDurationMs: 2000,
  easingFunction: 'ease-in',
  backgroundColor: '#f6f7f8',
  targetSelectors: ['.figma-sidenav .logo-img'],
  targetRetryFrames: 30,
  hideTargetUntilPercent: 0.99,
  endPosition: () => measureIntroTarget('.figma-sidenav .logo-img'),
};
