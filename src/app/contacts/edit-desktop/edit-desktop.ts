import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IContact } from '../../interfaces/i-contact';
import { FbService } from '../../services/fb-service';

@Component({
  selector: 'app-edit-desktop',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-desktop.html',
  styleUrls: ['./edit-desktop.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditDesktop {
  private fbService = inject(FbService);

  constructor() { this.getCurrentContact(); }

contact: IContact = { name: '', surname: '', email: '', phone: '' };
editedContact: IContact = { ...this.contact };
isClosing = false;  // Für Slide-out Animation

onClose() {
this.isClosing = true;
// Warte auf Animation-Ende bevor das Overlay geschlossen wird
setTimeout(() => {
  this.fbService.showEditContact = false;
}, 400); // 400ms entspricht der Animation-Duration
}

/** Schließt bei Klick auf dunklen Hintergrund */
onOverlayClick(event: MouseEvent) {
if (event.target === event.currentTarget) {
  this.onClose();
}
}

delContact() {
this.fbService.contactsArray.length > 0 && this.fbService.contactsGroups.length > 0 &&
this.fbService.contactsArray.length > this.fbService.id ? this.fbService.delContact(this.fbService.id) : null;
this.isClosing = true;
// Warte auf Animation-Ende bevor das Overlay geschlossen wird
setTimeout(() => {
  this.fbService.showEditContact = false;
}, 400); // 400ms entspricht der Animation-Duration
}

async upContact(form: any) {
// Markiere alle Felder als touched, damit Validierungsmeldungen angezeigt werden
Object.keys(form.controls).forEach(key => {
  form.controls[key].markAsTouched();
});

// Verwende die bereits vorhandene isFormValid Methode für vollständige Validierung
if (!this.isFormValid(form)) {
  return; // Stoppe die Ausführung wenn das Formular ungültig ist
}

await this.fbService.updateContact(this.fbService.id, this.editedContact);
this.isClosing = true;
// Warte auf Animation-Ende bevor das Overlay geschlossen wird
setTimeout(() => {
  this.fbService.showEditContact = false;
}, 400); // 400ms entspricht der Animation-Duration
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

// Custom Name/Surname-Kapitalisierung
if (this.hasInvalidCapitalization(this.editedContact.name) ||
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