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

  /**
   * Persists a new contact and clears local form fields.
   * @returns {void} No return value.
   */
  addContact() {
    this.fbService.addContact(this.contact);
    this.clearInput();
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
   * Starts closing animation and emits close after animation ends.
   * @returns {void} No return value.
   */
  closeOverlay() {
    this.isClosing = true;
    // Wait for animation end before closing the overlay.
    setTimeout(() => {
      this.close.emit();
    }, 400); // 400ms matches the animation duration.
  }

  /**
   * Validates input and creates the contact when all checks pass.
   * @returns {void} No return value.
   */
  onSubmit() {
    // Run full validation before creating a contact.
    if (this.validateAllFields()) {
      this.addContact();
      this.created.emit();
      this.closeOverlay();
    }
  }

  /**
   * Runs all field-level custom validations for contact creation.
   * @returns {boolean} True when all fields are valid.
   */
  validateAllFields(): boolean {
    // Mark all fields as touched so validation messages become visible.
    this.markAllFieldsAsTouched();
    
    // Verify whether all validations pass.
    const isNameValid = !!this.contact.name && !this.hasInvalidCharacters(this.contact.name) && !this.hasInvalidCapitalization(this.contact.name);
    const isSurnameValid = !!this.contact.surname && !this.hasInvalidCharacters(this.contact.surname) && !this.hasInvalidCapitalization(this.contact.surname);
    const isEmailValid = !!this.contact.email && !this.hasInvalidEmailFormat(this.contact.email);
    const isPhoneValid = !this.contact.phone || !this.hasInvalidPhoneFormat(this.contact.phone);
    
    return isNameValid && isSurnameValid && isEmailValid && isPhoneValid;
  }

  /**
   * Marks all form controls as touched.
   * @returns {void} No return value.
   */
  private markAllFieldsAsTouched(): void {
    if (this.form && this.form.form) {
      Object.keys(this.form.form.controls).forEach(key => {
        this.form.form.get(key)?.markAsTouched();
      });
    }
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
   * Closes overlay when user clicks directly on backdrop.
   * @param {MouseEvent} event - Overlay click event.
   * @returns {void} No return value.
   */
  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeOverlay();
    }
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
    
    // Reuse the same business validation logic as in validateAllFields.
    const isNameValid = !!this.contact.name && !this.hasInvalidCharacters(this.contact.name) && !this.hasInvalidCapitalization(this.contact.name);
    const isSurnameValid = !!this.contact.surname && !this.hasInvalidCharacters(this.contact.surname) && !this.hasInvalidCapitalization(this.contact.surname);
    const isEmailValid = !!this.contact.email && !this.hasInvalidEmailFormat(this.contact.email);
    const isPhoneValid = !this.contact.phone || !this.hasInvalidPhoneFormat(this.contact.phone);
    
    return isNameValid && isSurnameValid && isEmailValid && isPhoneValid;
  }
}
