import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'figma-sidenav',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './figma-sidenav.html',
  styleUrls: ['./figma-sidenav.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FigmaSidenav {
  /**
   * Returns a stable tracking key for repeated list rendering.
   * @param {number} _ - Fallback index provided by Angular.
   * @param {any} item - Current rendered item.
   * @returns {unknown} Item id when available; otherwise fallback index.
   */
  trackByIdx(_: number, item: any) { return item?.id ?? _; }
}
