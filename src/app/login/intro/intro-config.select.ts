import { IntroAnimationConfig } from './intro-animation-config.model';
import { introConfigDesktopAuth } from './intro-config-desktop-auth';
import { introConfigDesktopGuest } from './intro-config-desktop-guest';
import { introConfigMobileAuth } from './intro-config-mobile-auth';
import { introConfigMobileGuest } from './intro-config-mobile-guest';

/**
 * Selects intro animation config from viewport mode and auth state.
 * @param {boolean} isMobile - True when viewport is mobile.
 * @param {boolean} isAuthenticated - True when startup route resolves to authenticated area.
 * @returns {IntroAnimationConfig} Matching intro animation configuration.
 */
export function selectIntroConfig(isMobile: boolean, isAuthenticated: boolean): IntroAnimationConfig {
  if (isMobile && isAuthenticated) return introConfigMobileAuth;
  if (isMobile && !isAuthenticated) return introConfigMobileGuest;
  if (!isMobile && isAuthenticated) return introConfigDesktopAuth;
  return introConfigDesktopGuest;
}
