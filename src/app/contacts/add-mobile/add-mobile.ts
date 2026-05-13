import { Component, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter, NgZone, Output, inject } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  contact: IContact = {} as IContact;
  id = 0;
  isClosing = false;
  duplicateEmail = false;
  private readonly closeAnimationMs = 300;

  /**
   * Triggers full validation and creates a contact when valid.
   * @param {any} form - Template-driven form reference.
   * @returns {void} No return value.
   */
  async onCreateContactClick(form: any) {
    this.duplicateEmail = false;
    this.markAllFieldsAsTouched(form);
    if (this.isFormValid(form)) {
      await this.addContact();
    }
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
  private async addContact() {
    try {
      await this.fbService.addContact(this.contact);
      this.clearInput();
      this.created.emit();
      this.closeOverlayWithAnimation();
      this.fbService.refreshContactList();
    } catch (error) {
      this.handleSubmitError(error);
    }
  }

  /**
   * Clears duplicate-email UI state when the email value changes.
   * @returns {void} No return value.
   */
  onEmailChange(): void {
    this.duplicateEmail = false;
  }

  /**
   * Maps submit failures to component-level validation flags.
   * @param {unknown} error - Error thrown during submit.
   * @returns {void} No return value.
   */
  private handleSubmitError(error: unknown): void {
    this.duplicateEmail = this.isDuplicateEmailError(error);
  }

  /**
   * Identifies whether an error represents a duplicate contact email.
   * @param {unknown} error - Error thrown during submit.
   * @returns {boolean} True when duplicate-email condition was detected.
   */
  private isDuplicateEmailError(error: unknown): boolean {
    return error instanceof Error && error.message === 'CONTACT_EMAIL_EXISTS';
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
    this.zone.run(() => {
      this.isClosing = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.close.emit();
        this.isClosing = false;
        this.cdr.markForCheck();
      }, this.closeAnimationMs);
    });
  }


  /**
   * Validates that field length does not exceed maximum allowed.
   * @param {string | undefined} value - Field value to validate.
   * @param {number} maxLength - Maximum allowed length.
   * @returns {boolean} True when length exceeds maximum.
   */
  hasExceededMaxLength(value: string | undefined, maxLength: number): boolean {
    if (!value) return false;
    return value.length > maxLength;
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
   * Validates form state using Angular and custom validation rules.
   * @param {any} form - Template-driven form reference.
   * @returns {boolean} True when form data is valid.
   */
  isFormValid(form: any): boolean {
    if (form.invalid) return false;
    if (this.hasInvalidPhoneFormat(this.contact.phone)) return false;
    if (this.hasInvalidNameData(this.contact.name, this.contact.surname)) return false;
    if (this.hasInvalidEmailFormat(this.contact.email)) return false;
    if (this.hasExceededMaxLength(this.contact.name, 50)) return false;
    if (this.hasExceededMaxLength(this.contact.surname, 50)) return false;
    if (this.hasExceededMaxLength(this.contact.email, 254)) return false;
    if (this.hasExceededMaxLength(this.contact.phone, 20)) return false;
    return true;
  }

  /**
   * Checks name and surname for invalid characters and missing capitalization.
   * @param {string | undefined} name - First name to validate.
   * @param {string | undefined} surname - Last name to validate.
   * @returns {boolean} True when either name or surname fails character or capitalization rules.
   */
  private hasInvalidNameData(name: string | undefined, surname: string | undefined): boolean {
    return (
      this.hasInvalidCharacters(name) ||
      this.hasInvalidCharacters(surname) ||
      this.hasInvalidCapitalization(name) ||
      this.hasInvalidCapitalization(surname)
    );
  }
}