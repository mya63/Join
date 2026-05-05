import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IContact } from '../../interfaces/i-contact';
import { FbService } from '../../services/fb-service';


@Component({
  selector: 'app-add-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-mobile.html',
  styleUrls: ['./add-mobile.scss']
})

export class AddMobile {
  @Output() close = new EventEmitter<void>();     // Overlay schließen
  @Output() created = new EventEmitter<void>();   // Toast triggern (Parent)

  contact: IContact = {} as IContact;
  id = 0;
  isClosing = false;
  constructor(private fbService: FbService) { }

  /** Button-Handler für Create Contact - führt Validierung durch und speichert wenn gültig */
  onCreateContactClick(form: any) {
    // Alle Felder als touched markieren, um Validierungsfehler anzuzeigen
    this.markAllFieldsAsTouched(form);

    // Nur speichern wenn Formular gültig ist
    if (this.isFormValid(form)) {
      this.addContact();
    }
    // Wenn ungültig, bleiben die Validierungsmeldungen durch markAsTouched sichtbar
  }

  /** Alle Formularfelder als touched markieren */
  private markAllFieldsAsTouched(form: any) {
    if (form && form.controls) {
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
    }
  }

  /** Kontakt speichern */
  private addContact() {
    this.fbService.addContact(this.contact);
    this.clearInput();
    this.created.emit();
    this.closeOverlayWithAnimation();
    this.fbService.refreshContactList();
  }

  /** Formularfelder zurücksetzen */
  clearInput() {
    this.contact.name = '';
    this.contact.surname = '';
    this.contact.email = '';
    this.contact.phone = '';
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
      this.close.emit();
      this.isClosing = false;
    }, 300);
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
    if (this.hasInvalidPhoneFormat(this.contact.phone)) {
      return false;
    }

    // Custom Name/Surname-Kapitalisierung und Zeichen
    if (this.hasInvalidCharacters(this.contact.name) || this.hasInvalidCharacters(this.contact.surname) ||
      this.hasInvalidCapitalization(this.contact.name) ||
      this.hasInvalidCapitalization(this.contact.surname)) {
      return false;
    }

    // Custom Email-Format
    if (this.hasInvalidEmailFormat(this.contact.email)) {
      return false;
    }

    return true;
  }
}