import { Component, ChangeDetectionStrategy, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel, NgForm } from '@angular/forms';
import { FbService } from '../../services/fb-service';
import { IContact } from  '../../interfaces/i-contact';

@Component({
  selector: 'app-add-desktop',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-desktop.html',
  styleUrls: ['./add-desktop.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddDesktop {
  fbService = inject(FbService);

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  @ViewChild('nameInput') nameInput!: NgModel;
  @ViewChild('surnameInput') surnameInput!: NgModel;
  @ViewChild('emailInput') emailInput!: NgModel;
  @ViewChild('phoneInput') phoneInput!: NgModel;
  @ViewChild('f') form!: NgForm;

  contact: IContact = {} as IContact;
  id = 0;
  isClosing = false;

  /** Kontakt speichern */
  addContact() {
    this.fbService.addContact(this.contact);
    this.clearInput();
  }

  /** Formularfelder zurücksetzen */
  clearInput() {
    this.contact.name = '';
    this.contact.surname = '';
    this.contact.email = '';
    this.contact.phone = '';
  }

  /** Overlay schließen mit Slide-out Animation */
  closeOverlay() {
    this.isClosing = true;
    // Warte auf Animation-Ende bevor das Overlay geschlossen wird
    setTimeout(() => {
      this.close.emit();
    }, 400); // 400ms entspricht der Animation-Duration
  }

  /** Submit-Handler für Create Contact Button */
  onSubmit() {
    // Führe alle Validierungsprüfungen aus bevor der Kontakt erstellt wird
    if (this.validateAllFields()) {
      this.addContact();
      this.created.emit();
      this.closeOverlay();
    }
  }

  /** Validiert alle Felder und triggert die Anzeige von Fehlermeldungen */
  validateAllFields(): boolean {
    // Markiere alle Felder als "touched" damit Validierungsmeldungen angezeigt werden
    this.markAllFieldsAsTouched();
    
    // Prüfe ob alle Validierungen bestanden sind
    const isNameValid = !!this.contact.name && !this.hasInvalidCharacters(this.contact.name) && !this.hasInvalidCapitalization(this.contact.name);
    const isSurnameValid = !!this.contact.surname && !this.hasInvalidCharacters(this.contact.surname) && !this.hasInvalidCapitalization(this.contact.surname);
    const isEmailValid = !!this.contact.email && !this.hasInvalidEmailFormat(this.contact.email);
    const isPhoneValid = !this.contact.phone || !this.hasInvalidPhoneFormat(this.contact.phone);
    
    return isNameValid && isSurnameValid && isEmailValid && isPhoneValid;
  }

  /** Markiert alle Formularfelder als touched für die Validierungsanzeige */
  private markAllFieldsAsTouched(): void {
    if (this.form && this.form.form) {
      Object.keys(this.form.form.controls).forEach(key => {
        this.form.form.get(key)?.markAsTouched();
      });
    }
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

  /** Schließt bei Klick auf dunklen Hintergrund */
  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeOverlay();
    }
  }

  /** Prüft ob das gesamte Formular gültig ist, inkl. custom phone validation */
  isFormValid(form: any): boolean {
    // Standard Form-Validierung
    if (form.invalid) {
      return false;
    }
    
    // Verwende die gleiche Validierungslogik wie bei validateAllFields
    const isNameValid = !!this.contact.name && !this.hasInvalidCharacters(this.contact.name) && !this.hasInvalidCapitalization(this.contact.name);
    const isSurnameValid = !!this.contact.surname && !this.hasInvalidCharacters(this.contact.surname) && !this.hasInvalidCapitalization(this.contact.surname);
    const isEmailValid = !!this.contact.email && !this.hasInvalidEmailFormat(this.contact.email);
    const isPhoneValid = !this.contact.phone || !this.hasInvalidPhoneFormat(this.contact.phone);
    
    return isNameValid && isSurnameValid && isEmailValid && isPhoneValid;
  }
}
