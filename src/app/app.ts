import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FigmaHeader } from './shared/layout/figma-header/figma-header';
import { FigmaSidenav } from './shared/layout/figma-sidenav/figma-sidenav';
import { FigmaBottomNav } from './shared/layout/figma-bottom-nav/figma-bottom-nav';
import { Location } from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FigmaHeader, FigmaSidenav, FigmaBottomNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('join2');
  private location = inject(Location);

  goOn() {
    const currentPath = this.location.path().split('?')[0];
    const goOn = ["", "/", "/login", "/sign-up", "/privacy-policy", "/legal-notice"].includes(currentPath)
    return goOn;
  };

}
