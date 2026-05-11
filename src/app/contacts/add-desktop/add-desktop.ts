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
  duplicateEmail = false;

  /**
   * Persists a new contact and clears local form fields.
   * @returns {void} No return value.
   */
  async addContact(): Promise<boolean> {
    try {
      await this.fbService.addContact(this.contact);
      this.clearInput();
      return true;
    } catch (error) {
      this.handleSubmitError(error);
      return false;
    }
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
    setTimeout(() => {
      this.close.emit();
    }, 400);
  }

  /**
   * Validates input and creates the contact when all checks pass.
   * @returns {void} No return value.
   */
  async onSubmit() {
    this.duplicateEmail = false;
    if (this.validateAllFields()) {
      const created = await this.addContact();
      if (!created) return;
      this.created.emit();
      this.closeOverlay();
    }
  }

  onEmailChange(): void {
    this.duplicateEmail = false;
  }

  private handleSubmitError(error: unknown): void {
    this.duplicateEmail = this.isDuplicateEmailError(error);
  }

  private isDuplicateEmailError(error: unknown): boolean {
    return error instanceof Error && error.message === 'CONTACT_EMAIL_EXISTS';
  }

  /**
   * Runs all field-level custom validations for contact creation.
   * @returns {boolean} True when all fields are valid.
   */
  validateAllFields(): boolean {
    this.markAllFieldsAsTouched();

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
      return false;
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
      return false;
    }

    if (email.endsWith('.')) {
      return true;
    }

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
      return false;
    }

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
    if (form.invalid) {
      return false;
    }

    const isNameValid = !!this.contact.name && !this.hasInvalidCharacters(this.contact.name) && !this.hasInvalidCapitalization(this.contact.name);
    const isSurnameValid = !!this.contact.surname && !this.hasInvalidCharacters(this.contact.surname) && !this.hasInvalidCapitalization(this.contact.surname);
    const isEmailValid = !!this.contact.email && !this.hasInvalidEmailFormat(this.contact.email);
    const isPhoneValid = !this.contact.phone || !this.hasInvalidPhoneFormat(this.contact.phone);
    
    return isNameValid && isSurnameValid && isEmailValid && isPhoneValid;
  }
}
