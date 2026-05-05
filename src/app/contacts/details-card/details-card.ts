import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IContact } from '../../interfaces/i-contact';
import { FbService } from '../../services/fb-service';
import { EditDesktop } from '../edit-desktop/edit-desktop';
import { EditMobile } from '../edit-mobile/edit-mobile';

@Component({
  selector: 'app-details-card',
  imports: [CommonModule, EditDesktop, EditMobile],
  templateUrl: './details-card.html',
  styleUrl: './details-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsCard {
  private fbService = inject(FbService);

  slide = false;
  currentContactId = -1;
  deleteError = signal(false);

  get currentContact(): IContact {
    return this.fbService.currentContact;
  }

  async delContact() {
    const canDelete =
      this.fbService.contactsArray.length > 0 &&
      this.fbService.contactsGroups.length > 0 &&
      this.fbService.contactsArray.length > this.fbService.id;
    if (!canDelete) return;
    const deleted = await this.fbService.delContact(this.fbService.id);
    if (!deleted) {
      this.deleteError.set(true);
    }
  }

  setEditContact() {
    this.fbService.showEditContact = true;
    return this.fbService.showEditContact;
  }

  showMobile() {
    return this.fbService.showEditContact;
  }

  setSlide() {
    if (this.fbService.id != this.currentContactId) {
      this.slide = true;
      this.deleteError.set(false);
      setTimeout(() => {
        this.currentContactId = this.fbService.id;
        this.slide = false;
      }, 100);
    }
    return this.slide;
  }

  closeMobileContactCard() {
    this.fbService.showEditContact = false;
    return this.fbService.showEditContact;
  }

}
