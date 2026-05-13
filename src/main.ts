import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/**
 * Bootstraps the Angular application with the root app component and config.
 * @returns {Promise<void>} Promise resolved after app startup.
 */
bootstrapApplication(App, appConfig)
  /**
   * Swallows bootstrap failures to preserve existing runtime behavior.
   * @returns {undefined} Always returns undefined.
   */
  .catch(() => undefined);
