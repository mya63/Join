import { Component } from '@angular/core';

/**
 * Empty bootstrap component used as root route placeholder.
 * Routes are resolved and navigated programmatically in App component.
 * This prevents premature component rendering before startup logic completes.
 */
@Component({
  selector: 'app-startup-bootstrap',
  template: '',
  styles: [':host { display: none; }'],
  standalone: true,
})
export class StartupBootstrap {}
