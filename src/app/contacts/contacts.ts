import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FbService } from '../services/fb-service';
import { IContact } from '../interfaces/i-contact';
import { AddDesktop } from './add-desktop/add-desktop';
import { AddMobile } from './add-mobile/add-mobile';
import { Created } from './created/created';
import { DetailsCard } from './details-card/details-card';
import { MobileMenu } from './mobile-menu/mobile-menu';
import { EditMobile } from './edit-mobile/edit-mobile';

@Component({
  selector: 'app-contacts',
  imports: [CommonModule, FormsModule, AddDesktop, AddMobile, Created, DetailsCard, MobileMenu, EditMobile],
  templateUrl: './contacts.html',
  styleUrls: ['./contacts.scss'],
})
export class Contacts {
  fbService = inject(FbService);

  topbarTitle = 'Kanban Project Management Tool';

  contact: IContact = {} as IContact;
  currentContact: IContact = {} as IContact;
  currentContactInitials = '';
  id = 0;
  showAddContact = false;
  myWidth = window.innerWidth;
  toastOpen = false;
  private toastTimer?: ReturnType<typeof setTimeout>;
  showOptions = false;
  deleteError = signal(false);

  /**
   * Returns whether the contact list panel is currently hidden.
   * @returns {boolean} True when the list is hidden.
   */
  getContactlistHidden() { return this.fbService.contactlistHidden; }
  /**
   * Returns contacts grouped by their leading letter.
   * @returns {IContact[][]} Grouped contacts structure used by the list view.
   */
  getContactsGroups() { return this.fbService.contactsGroups; }
  /**
   * Returns the flat contacts array.
   * @returns {IContact[]} All loaded contacts.
   */
  getContacts() { return this.fbService.contactsArray; }
  /**
   * Returns the raw Firestore data cache from the contact service.
   * @returns {unknown} Raw data payload as provided by the service.
   */
  getData() { return this.fbService.data; }
  /**
   * Returns the currently selected contact.
   * @returns {IContact} Selected contact object.
   */
  getCurrentContact() { return this.fbService.currentContact; }
  /**
   * Checks whether a list item id matches the active contact id.
   * @param {number} id - Contact index from the rendered list.
   * @returns {boolean} True when the given id is active.
   */
  getActiveContactId(id: number) { return this.fbService.id === id ? true : false; }


  /**
   * Persists a new contact and shows a short success toast.
   * @returns {void} No return value.
   */
  addContact() {
    this.fbService.addContact(this.contact);
    this.clearInput();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastOpen = true;
    /**
     * Hides the create-success toast after a short display duration.
     * @returns {void} No return value.
     */
    this.toastTimer = setTimeout(() => (this.toastOpen = false), 800);
  }

  /**
   * Updates the current contact and clears the local input model.
   * @returns {void} No return value.
   */
  upContact() {
    this.fbService.updateContact(this.id, this.contact);
    this.clearInput();
  }

  /**
   * Stores candidate position values for deferred index updates.
   * @param {string} id - Contact document id.
   * @param {string} field - Name of the index field.
   * @param {number} value - Proposed position value.
   * @returns {void} No return value.
   */
  updatePositionIndex(id: string, field: string, value: number) {
    this.fbService.i.push(value);
  }

  /**
   * Deletes the currently selected contact when the index is valid.
   * @returns {void} No return value.
   */
  delContact() {
    if (this.fbService.contactsArray.length > this.id) {
      this.fbService.delContact(this.id);
    }
  }

  /**
   * Clears the local contact form model fields.
   * @returns {void} No return value.
   */
  clearInput() {
    this.contact.name = '';
    this.contact.surname = '';
    this.contact.email = '';
    this.contact.phone = '';
  }

  /**
   * Selects a contact, computes initials, and updates mobile list visibility.
   * @param {number} index - Index of the contact to display.
   * @returns {void} No return value.
   */
  showContact(index: number) {
    this.deleteError.set(false);
    this.fbService.id = index;
    this.currentContact = this.fbService.setCurrentContact(index);
    const firstName = this.currentContact.name || '';
    const lastName = this.currentContact.surname || '';
    this.currentContactInitials =
      firstName.substring(0, 1).toUpperCase() + lastName.substring(0, 1).toUpperCase();
    this.myWidth < 1100 ? this.fbService.contactlistHidden = true : null;
  }


  /**
   * Returns whether the edit contact overlay is visible.
   * @returns {boolean} True when edit mode is active.
   */
  showEditContact() { return this.fbService.showEditContact; }

  /**
   * Opens the create-contact overlay.
   * @returns {void} No return value.
   */
  showContactOverlay() { this.showAddContact = true; }

  /**
   * Closes the create-contact overlay.
   * @returns {void} No return value.
   */
  onCloseOverlay() { this.showAddContact = false; }

  /**
   * Shows the contact list again in mobile layout.
   * @returns {void} No return value.
   */
  closeMobileContact() {
    this.fbService.contactlistHidden = false;
  }

  /**
   * Handles successful contact creation and displays feedback toast.
   * @returns {void} No return value.
   */
  onContactCreated() {
    this.showAddContact = false;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastOpen = true;
    /**
     * Hides the create-success toast after the standard display duration.
     * @returns {void} No return value.
     */
    this.toastTimer = setTimeout(() => (this.toastOpen = false), 2000);
  }

  /**
   * Reacts to viewport changes and restores desktop list visibility.
   * @param {Event} event - Window resize event.
   * @returns {void} No return value.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.myWidth = window.innerWidth;
    if (this.myWidth > 1100) {
      this.fbService.contactlistHidden = false;
    }
  }

  /**
   * Initializes width-dependent UI state on component startup.
   * @returns {void} No return value.
   */
  ngOnInit() {
    this.myWidth = window.innerWidth;
  }


  /**
   * Toggles the mobile options menu.
   * @returns {void} No return value.
   */
  toggleOptions() { this.showOptions = !this.showOptions; }

  /**
   * Opens contact edit mode from the mobile options menu.
   * @returns {void} No return value.
   */
  onEdit() {
    this.fbService.contactlistHidden = true;
    this.showOptions = false;
    this.fbService.showEditContact = true;
  }

  /**
   * Deletes the selected contact and shows an error state if deletion fails.
   * @returns {void} No return value.
   */
  async onDelete() {
    this.fbService.contactlistHidden = true;
    this.showOptions = false;
    const idx = this.fbService.id;
    if (typeof idx === 'number') {
      const deleted = await this.fbService.delContact(idx);
      if (!deleted) {
        this.fbService.contactlistHidden = true;
        this.deleteError.set(true);
      }
    }
  }


}
