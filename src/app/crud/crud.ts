import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FbService } from '../services/fb-service';
import { FormsModule } from '@angular/forms';
import { IContact } from '../interfaces/i-contact';


@Component({
  selector: 'app-crud',
  imports: [FormsModule],
  templateUrl: './crud.html',
  styleUrl: './crud.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class crud {
  fbService = inject(FbService);
  contact: IContact = {} as IContact;
  id: number = 0;

  /**
   * Returns grouped contact section headers.
   * @returns {string[]} Contact group labels.
   */
  getContactsGroups() {
    return this.fbService.contactsGroups;
  }

  /**
   * Returns all contacts currently available in the service.
   * @returns {IContact[]} Contact array.
   */
  getContacts() {
    return this.fbService.contactsArray;
  }

  /**
   * Persists a new contact and clears the local form model.
   * @returns {void} No return value.
   */
  addContact() {
    this.fbService.addContact(this.contact);
    this.clearInput();

  }

  /**
   * Updates the selected contact and clears the local form model.
   * @returns {void} No return value.
   */
  upContact() {
    this.fbService.updateContact(this.id, this.contact);
    this.clearInput();
  }

  /**
   * Deletes the selected contact when index bounds are valid.
   * @returns {void} No return value.
   */
  delContact() {
    this.fbService.contactsArray.length > 0 && this.fbService.contactsGroups.length > 0 &&
      this.fbService.contactsArray.length > this.id ? this.fbService.delContact(this.id) : null;
  }

  /**
   * Returns raw data collection snapshot from the service.
   * @returns {any[]} Raw data entries.
   */
  getData() {
    return this.fbService.data;
  }


  /**
   * Clears all contact input fields.
   * @returns {void} No return value.
   */
  clearInput() {
    this.contact.name = "";
    this.contact.surname = "";
    this.contact.email = "";
    this.contact.phone = "";
  }

}
