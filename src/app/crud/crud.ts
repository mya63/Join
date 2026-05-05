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

  getContactsGroups() {
    return this.fbService.contactsGroups;
  }

  getContacts() {
    return this.fbService.contactsArray;
  }

  addContact() {
    this.fbService.addContact(this.contact);
    console.log(this.contact);
    this.clearInput();

  }

  upContact() {
    this.fbService.updateContact(this.id, this.contact);
    console.log("Updated contact with ID:", this.id);
    this.clearInput();
  }

  delContact() {
    console.log(this.fbService.contactsGroups.length, this.id, this.fbService.addContact.length);
    this.fbService.contactsArray.length > 0 && this.fbService.contactsGroups.length > 0 &&
      this.fbService.contactsArray.length > this.id ? this.fbService.delContact(this.id) : null;
  }

  getData() {
    return this.fbService.data;
  }


  clearInput() {
    this.contact.name = "";
    this.contact.surname = "";
    this.contact.email = "";
    this.contact.phone = "";
  }

}
