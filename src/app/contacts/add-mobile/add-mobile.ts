import { Component, ChangeDetectionStrategy, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IContact } from '../../interfaces/i-contact';
import { FbService } from '../../services/fb-service';


@Component({
  selector: 'app-add-mobile',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-mobile.html',
  styleUrls: ['./add-mobile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddMobile {
  private fbService = inject(FbService);

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  contact: IContact = {} as IContact;
  id = 0;
  isClosing = false;

  /**
   * Triggers full validation and creates a contact when valid.
   * @param {any} form - Template-driven form reference.
   * @returns {void} No return value.
   */
  onCreateContactClick(form: any) {
    // Mark all fields as touched to show validation errors.
    this.markAllFieldsAsTouched(form);

    // Persist only when form is valid.
    if (this.isFormValid(form)) {
      this.addContact();
    }
    // If invalid, validation messages remain visible due to touched state.
  }

  /**
   * Marks all form controls as touched.
   * @param {any} form - Template-driven form reference.
   * @returns {void} No return value.
   */
  private markAllFieldsAsTouched(form: any) {
    if (form && form.controls) {
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
    }
  }

  /**
   * Persists the contact and triggers creation side effects.
   * @returns {void} No return value.
   */
  private addContact() {
    this.fbService.addContact(this.contact);
    this.clearInput();
    this.created.emit();
    this.closeOverlayWithAnimation();
    this.fbService.refreshContactList();
  }

  /**
   * Clears all contact input fields.
   * @returns {void} No return value.
   */
  clearInput() {
    this.contact.name = '';
    this.contact.surname = '';
    this.contact.email = '';
    this.contact.phone = '';
  }

  /**
   * Starts overlay close sequence.
   * @returns {void} No return value.
   */
  closeOverlay() {
    this.closeOverlayWithAnimation();
  }

  /**
   * Plays closing animation before final overlay teardown.
   * @returns {void} No return value.
   */
  closeOverlayWithAnimation() {
    this.isClosing = true;
    // Animation time before actually closing
    setTimeout(() => {
      this.close.emit();
      this.isClosing = false;
    }, 300);
  }


  /**
   * Validates that a name starts with an uppercase character.
   * @param {string | undefined} name - Name value to validate.
   * @returns {boolean} True when capitalization is invalid.
   */
  hasInvalidCapitalization(name: string | undefined): boolean {
    if (!name || name.length === 0) {
      return false; // Empty input is not treated as capitalization error.
    }
    return !/^[A-ZÄÖÜ]/.test(name);
  }

  /**
   * Validates whether name contains only allowed characters.
   * @param {string | undefined} name - Name value to validate.
   * @returns {boolean} True when invalid characters are present.
   */
  hasInvalidCharacters(name: string | undefined): boolean {
    if (!name || name.length === 0) {
      return false;
    }
    return !/^[A-ZÄÖÜa-zäöüß\-\.\s]+$/.test(name);
  }

  /**
   * Validates email format against project constraints.
   * @param {string | undefined} email - Email value to validate.
   * @returns {boolean} True when email format is invalid.
   */
  hasInvalidEmailFormat(email: string | undefined): boolean {
    if (!email || email.length === 0) {
      return false; // Empty input is handled by required validator.
    }

    // Reject emails that end with a trailing dot.
    if (email.endsWith('.')) {
      return true;
    }

    // Extended regex: local part, domain, dot, and at least 2 chars TLD.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
    return !emailRegex.test(email);
  }

  /**
   * Validates phone format against minimal numeric rules.
   * @param {string | undefined} phone - Phone value to validate.
   * @returns {boolean} True when phone format is invalid.
   */
  hasInvalidPhoneFormat(phone: string | undefined): boolean {
    if (!phone || phone.length === 0) {
      return false; // Empty input is valid because phone is optional.
    }

    // Regex: optional + prefix followed by at least 6 digits.
    const phoneRegex = /^\+?[0-9]{6,}$/;
    return !phoneRegex.test(phone);
  }

  /**
   * Validates form state using Angular and custom validation rules.
   * @param {any} form - Template-driven form reference.
   * @returns {boolean} True when form data is valid.
   */
  isFormValid(form: any): boolean {
    // Standard Angular form validation.
    if (form.invalid) {
      return false;
    }

    // Additional phone validation.
    if (this.hasInvalidPhoneFormat(this.contact.phone)) {
      return false;
    }

    // Additional name/surname character and capitalization validation.
    if (this.hasInvalidCharacters(this.contact.name) || this.hasInvalidCharacters(this.contact.surname) ||
      this.hasInvalidCapitalization(this.contact.name) ||
      this.hasInvalidCapitalization(this.contact.surname)) {
      return false;
    }

    // Additional email format validation.
    if (this.hasInvalidEmailFormat(this.contact.email)) {
      return false;
    }

    return true;
  }
}