import { Component, DoCheck, inject, signal } from '@angular/core';
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
})
export class DetailsCard {
  private fbService = inject(FbService);
  private emptyContact: IContact = { name: '', surname: '', email: '', phone: '' } as IContact;

  slideClass: 'slideInFromRightA' | 'slideInFromRightB' = 'slideInFromRightA';
  currentContactId = -1;
  deleteError = signal(false);

  /**
   * Returns a normalized contact object for the current selection.
   * @returns {IContact} Contact with safe default field values.
   */
  get currentContact(): IContact {
    const selected = this.fbService.contactsArray[this.fbService.id];
    const base = selected ?? this.fbService.currentContact ?? this.emptyContact;
    return {
      ...base,
      name: base.name || '',
      surname: base.surname || '',
      email: base.email || '',
      phone: base.phone || '',
    } as IContact;
  }

  /**
   * Returns uppercase initials derived from current contact names.
   * @returns {string} Two-letter initials.
   */
  get initials(): string {
    const nameInitial = this.currentContact.name.substring(0, 1).toUpperCase();
    const surnameInitial = this.currentContact.surname.substring(0, 1).toUpperCase();
    return `${nameInitial}${surnameInitial}`;
  }

  /**
   * Returns the display-ready full name of the current contact.
   * @returns {string} Trimmed full name string.
   */
  get fullName(): string {
    return `${this.currentContact.name} ${this.currentContact.surname}`.trim();
  }

  /**
   * Runs custom change detection checks for derived state updates.
   * @returns {void} No return value.
   */
  ngDoCheck(): void {
    if (this.fbService.id !== this.currentContactId) {
      this.deleteError.set(false);
      this.currentContactId = this.fbService.id;
      this.slideClass = this.slideClass === 'slideInFromRightA' ? 'slideInFromRightB' : 'slideInFromRightA';
    }
  }

  /**
   * Deletes the selected contact and flags failures for UI feedback.
   * @returns {void} No return value.
   */
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

  /**
   * Enables edit mode for the selected contact.
   * @returns {boolean} Current edit-mode flag state.
   */
  setEditContact() {
    this.fbService.showEditContact = true;
    return this.fbService.showEditContact;
  }

  /**
   * Returns whether edit mode is active in mobile context.
   * @returns {boolean} True when mobile edit UI should be shown.
   */
  showMobile() {
    return this.fbService.showEditContact;
  }

  /**
   * Closes the mobile contact edit card.
   * @returns {boolean} Updated edit-mode flag state.
   */
  closeMobileContactCard() {
    this.fbService.showEditContact = false;
    return this.fbService.showEditContact;
  }

}
