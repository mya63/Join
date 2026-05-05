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
  trackByIdx(_: number, item: any) { return item?.id ?? _; }
}
