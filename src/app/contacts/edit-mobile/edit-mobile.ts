import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IContact } from '../../interfaces/i-contact';
import { FbService } from '../../services/fb-service';

@Component({
  selector: 'app-edit-mobile',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-mobile.html',
  styleUrls: ['./edit-mobile.scss'],
})
export class EditMobile {
  private fbService = inject(FbService);

  constructor() { this.getCurrentContact(); }

  contact: IContact = { name: '', surname: '', email: '', phone: '' };
  editedContact: IContact = { ...this.contact };
  isClosing = false;

  onClose() {
    this.fbService.showEditContact = false;
    this.fbService.contactlistHidden = false;
  }

  delContact() {
    this.fbService.contactsArray.length > 0 && this.fbService.contactsGroups.length > 0 &&
      this.fbService.contactsArray.length > this.fbService.id ? this.fbService.delContact(this.fbService.id) : null;
    this.fbService.showEditContact = false;
    this.fbService.contactlistHidden = false;
  }

  /** Overlay schließen */
  closeOverlay() {
    this.closeOverlayWithAnimation();
  }

  /** Overlay mit Animation schließen */
  closeOverlayWithAnimation() {
    this.isClosing = true;
    // Animation time before actually closing
    setTimeout(() => {
      this.onClose();
      this.isClosing = false;
    }, 300);
  }

  upContact(form?: any) {
    // Validierung vor dem Speichern ausführen
    if (form && !this.isFormValid(form)) {
      // Alle Felder als berührt markieren, um Validierungsmeldungen anzuzeigen
      this.markAllFieldsAsTouched(form);
      return; // Speichern abbrechen, wenn Validierung fehlschlägt
    }

    this.fbService.updateContact(this.fbService.id, this.editedContact);
    this.onClose();
    this.isClosing = false;
  }

  /** Markiert alle Formularfelder als berührt, um Validierungsmeldungen anzuzeigen */
  markAllFieldsAsTouched(form: any) {
    if (form && form.controls) {
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
    }
  }

  getCurrentContact() {
    this.editedContact = { ...this.fbService.currentContact };
    return this.editedContact;
  }

  getShowEditContact() {
    return this.fbService.showEditContact;
  }

  /** Prüft ob der erste Buchstabe eines Namens klein geschrieben ist */
  hasInvalidCapitalization(name: string | undefined): boolean {
    if (!name || name.length === 0) {
      return false; // Leer ist kein Kapitalisierungsfehler
    }
    return !/^[A-ZÄÖÜ]/.test(name);
  }

  /** Prüft ob der Name nur erlaubte Zeichen enthält */
  hasInvalidCharacters(name: string | undefined): boolean {
    if (!name || name.length === 0) {
      return false;
    }
    return !/^[A-ZÄÖÜa-zäöüß\-\.\s]+$/.test(name);
  }

  /** Erweiterte Email-Validierung: Domain gefolgt von Punkt und Top-Level-Domain */
  hasInvalidEmailFormat(email: string | undefined): boolean {
    if (!email || email.length === 0) {
      return false; // Leer ist kein Format-Fehler (wird durch required behandelt)
    }

    // Prüfe ob Email mit Punkt endet
    if (email.endsWith('.')) {
      return true;
    }

    // Erweiterte Regex: mindestens 1 Zeichen vor @, dann @, dann Domain (min. 2 Buchstaben), dann Punkt, dann TLD (min. 2 Buchstaben)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
    return !emailRegex.test(email);
  }

  /** Phone-Validierung: Muss numerisch sein, mindestens 6 Ziffern, optional + am Anfang */
  hasInvalidPhoneFormat(phone: string | undefined): boolean {
    if (!phone || phone.length === 0) {
      return false; // Leer ist kein Format-Fehler (Phone ist optional)
    }

    // Regex: Optional + am Anfang, dann mindestens 6 Ziffern
    const phoneRegex = /^\+?[0-9]{6,}$/;
    return !phoneRegex.test(phone);
  }

  /** Prüft ob das gesamte Formular gültig ist, inkl. custom phone validation */
  isFormValid(form: any): boolean {
    // Standard Form-Validierung
    if (form.invalid) {
      return false;
    }

    // Custom Phone-Validierung
    if (this.hasInvalidPhoneFormat(this.editedContact.phone)) {
      return false;
    }

    // Custom Name/Surname-Kapitalisierung und Zeichen
    if (this.hasInvalidCharacters(this.editedContact.name) || this.hasInvalidCharacters(this.editedContact.surname) ||
      this.hasInvalidCapitalization(this.editedContact.name) ||
      this.hasInvalidCapitalization(this.editedContact.surname)) {
      return false;
    }

    // Custom Email-Format
    if (this.hasInvalidEmailFormat(this.editedContact.email)) {
      return false;
    }

    return true;
  }
}