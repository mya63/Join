import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  /**
   * Initializes the edit overlay state from the currently selected contact.
   * @returns {void} No return value.
   */
  constructor() { this.getCurrentContact(); }

  contact: IContact = { name: '', surname: '', email: '', phone: '' };
  editedContact: IContact = { ...this.contact };
  isClosing = false;
  duplicateEmail = false;
  private readonly closeAnimationMs = 300;

  /**
   * Closes the mobile edit overlay and restores list visibility.
   * @returns {void} No return value.
   */
  onClose() {
    this.fbService.showEditContact = false;
    this.fbService.contactlistHidden = false;
  }

  /**
   * Deletes the selected contact and closes the mobile overlay.
   * @returns {void} No return value.
   */
  delContact() {
    this.fbService.contactsArray.length > 0 && this.fbService.contactsGroups.length > 0 &&
      this.fbService.contactsArray.length > this.fbService.id ? this.fbService.delContact(this.fbService.id) : null;
    this.fbService.showEditContact = false;
    this.fbService.contactlistHidden = false;
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

      /**
       * Finalizes overlay closing after animation duration elapsed.
       * @returns {void} No return value.
       */
      setTimeout(() => {
        this.onClose();
        this.isClosing = false;
        this.cdr.markForCheck();
      }, this.closeAnimationMs);
    });
  }

  /**
   * Validates and persists edited contact data.
   * @param {any} form - Template-driven form reference.
   * @returns {void} No return value.
   */
  async upContact(form?: any): Promise<void> {
    this.duplicateEmail = false;
    if (form && !this.isFormValid(form)) {
      this.markAllFieldsAsTouched(form);
      return;
    }

    if (!(await this.saveEditedContact())) {
      return;
    }
    this.closeOverlayWithAnimation();
  }

  /**
   * Persists the edited contact and translates duplicate-email errors into UI state.
   * @returns {Promise<boolean>} True when the contact update succeeded.
   */
  private async saveEditedContact(): Promise<boolean> {
    try {
      await this.fbService.updateContact(this.fbService.id, this.editedContact);
      return true;
    } catch (error) {
      this.handleSubmitError(error);
      return false;
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
   * Maps update failures to local validation state.
   * @param {unknown} error - Error thrown during contact update.
   * @returns {void} No return value.
   */
  private handleSubmitError(error: unknown): void {
    this.duplicateEmail = this.isDuplicateEmailError(error);
  }

  /**
   * Checks whether the thrown update error indicates duplicate email.
   * @param {unknown} error - Error thrown during contact update.
   * @returns {boolean} True when duplicate-email condition was detected.
   */
  private isDuplicateEmailError(error: unknown): boolean {
    return error instanceof Error && error.message === 'CONTACT_EMAIL_EXISTS';
  }

  /**
   * Marks all form controls as touched to trigger validation feedback.
   * @param {any} form - Template-driven form reference.
   * @returns {void} No return value.
   */
  markAllFieldsAsTouched(form: any) {
    if (form && form.controls) {
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
    }
  }

  /**
   * Returns a copy of the currently selected contact for editing.
   * @returns {IContact} Editable contact copy.
   */
  getCurrentContact() {
    this.editedContact = { ...this.fbService.currentContact };
    return this.editedContact;
  }

  /**
   * Returns whether the mobile edit overlay is currently visible.
   * @returns {boolean} True when edit mode is active.
   */
  getShowEditContact() {
    return this.fbService.showEditContact;
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
   * Runs full form validation including custom business rules.
   * @param {any} form - Template-driven form reference.
   * @returns {boolean} True when the form is valid.
   */
  isFormValid(form: any): boolean {
    if (form.invalid) return false;
    if (this.hasInvalidPhoneFormat(this.editedContact.phone)) return false;
    if (this.hasInvalidNameData(this.editedContact.name, this.editedContact.surname)) return false;
    if (this.hasInvalidEmailFormat(this.editedContact.email)) return false;
    if (this.hasExceededMaxLength(this.editedContact.name, 50)) return false;
    if (this.hasExceededMaxLength(this.editedContact.surname, 50)) return false;
    if (this.hasExceededMaxLength(this.editedContact.email, 254)) return false;
    if (this.hasExceededMaxLength(this.editedContact.phone, 20)) return false;
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
