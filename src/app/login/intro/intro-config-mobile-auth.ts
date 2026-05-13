import { IntroAnimationConfig } from './intro-animation-config.model';
import { IntroTargetPosition } from './intro-target-position';

/**
 * Returns the fixed mobile-auth target matching the mobile header J-logo slot.
 * @returns {IntroTargetPosition} Static target position for the mobile-auth intro.
 */
function resolveMobileAuthTarget(): IntroTargetPosition {
  return { x: '16px', y: '24px', width: '24px', height: '32px' };
}

export const introConfigMobileAuth: IntroAnimationConfig = {
  mode: 'mobile',
  authenticated: true,
  containerClass: 'intro-mobile-auth',
  logoSrc: 'assets/img/login/joindarkmobilewhite.png',
  logoAlt: 'Join Logo Mobile',
  redirectDelayMs: 2000,
  animationDurationMs: 2000,
  easingFunction: 'ease-in',
  backgroundColor: '#2a3647',
  targetSelectors: ['.mobile-only .j-logo', '.login-page .logo-img'],
  targetRetryFrames: 30,
  hideTargetUntilPercent: 0.99,
  endPosition: () => resolveMobileAuthTarget(),
};
