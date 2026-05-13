import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { inject } from '@angular/core';
import { FbService } from '../../../services/fb-service';

@Component({
  selector: 'figma-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './figma-bottom-nav.html',
  styleUrls: ['./figma-bottom-nav.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FigmaBottomNav {
  private router = inject(Router);
  private fbService = inject(FbService);

  /**
   * Restores the contacts list on mobile when the Contacts nav item is tapped again.
   * @returns {void} No return value.
   */
  onContactsTabClick(): void {
    if (this.router.url.startsWith('/contacts')) {
      this.fbService.contactlistHidden = false;
      this.fbService.showEditContact = false;
    }
  }
}
