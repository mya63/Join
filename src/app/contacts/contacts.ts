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

  getContactlistHidden() { return this.fbService.contactlistHidden; }
  getContactsGroups() { return this.fbService.contactsGroups; }
  getContacts() { return this.fbService.contactsArray; }
  getData() { return this.fbService.data; }
  getCurrentContact() { return this.fbService.currentContact; }
  getActiveContactId(id: number) { return this.fbService.id === id ? true : false; }


  addContact() {
    this.fbService.addContact(this.contact);
    this.clearInput();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastOpen = true;
    this.toastTimer = setTimeout(() => (this.toastOpen = false), 800);
  }

  upContact() {
    this.fbService.updateContact(this.id, this.contact);
    this.clearInput();
  }

  updatePositionIndex(id: string, field: string, value: number) {
    this.fbService.i.push(value);
    //if (Math.min(...this.fbService.i) === value) this.fbService.updateOneField(id, field, value);
    //console.log(id, field, Math.min(...this.fbService.i));
  }

  delContact() {
    if (this.fbService.contactsArray.length > this.id) {
      this.fbService.delContact(this.id);
    }
  }

  clearInput() {
    this.contact.name = '';
    this.contact.surname = '';
    this.contact.email = '';
    this.contact.phone = '';
  }

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


  showEditContact() { return this.fbService.showEditContact; }

  showContactOverlay() { this.showAddContact = true; }

  onCloseOverlay() { this.showAddContact = false; }

  closeMobileContact() {
    this.fbService.contactlistHidden = false;
  }

  onContactCreated() {
    this.showAddContact = false;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastOpen = true;
    this.toastTimer = setTimeout(() => (this.toastOpen = false), 2000);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.myWidth = window.innerWidth;
    if (this.myWidth > 1100) {
      this.fbService.contactlistHidden = false;
    }
  }

  ngOnInit() {
    this.myWidth = window.innerWidth;
  }


  toggleOptions() { this.showOptions = !this.showOptions; }

  onEdit() {
    this.fbService.contactlistHidden = true;
    this.showOptions = false;
    this.fbService.showEditContact = true;   // Flag setzen → passende Edit-Komponente wird sichtbar
    // this.edit.emit();
  }
  // Mobile: Delete löscht und schließt Karte
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
    // this.delete.emit();
    // this.goBack();
  }


}
