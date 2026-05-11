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
})
export class EditDesktop {
  private fbService = inject(FbService);

  constructor() { this.getCurrentContact(); }

contact: IContact = { name: '', surname: '', email: '', phone: '' };
editedContact: IContact = { ...this.contact };
isClosing = false;
duplicateEmail = false;

/**
 * Closes the desktop edit overlay with exit animation.
 * @returns {void} No return value.
 */
onClose() {
this.isClosing = true;
setTimeout(() => {
  this.fbService.showEditContact = false;
}, 400);
}

/**
 * Closes the overlay when the backdrop itself is clicked.
 * @param {MouseEvent} event - Overlay click event.
 * @returns {void} No return value.
 */
onOverlayClick(event: MouseEvent) {
if (event.target === event.currentTarget) {
  this.onClose();
}
}

/**
 * Deletes the selected contact and closes the overlay.
 * @returns {void} No return value.
 */
delContact() {
this.fbService.contactsArray.length > 0 && this.fbService.contactsGroups.length > 0 &&
this.fbService.contactsArray.length > this.fbService.id ? this.fbService.delContact(this.fbService.id) : null;
this.isClosing = true;
setTimeout(() => {
  this.fbService.showEditContact = false;
}, 400);
}

/**
 * Validates and persists edited contact data.
 * @param {any} form - The form.
 * @returns {void} No return value.
 */
async upContact(form: any): Promise<void> {
this.duplicateEmail = false;
this.markAllControlsTouched(form);
if (!this.isFormValid(form)) return;
await this.persistContactUpdate();
}

/**
 * Marks all form controls as touched to trigger validation message display.
 * @param {any} form - Template-driven form reference.
 * @returns {void} No return value.
 */
private markAllControlsTouched(form: any): void {
Object.keys(form.controls).forEach(key => {
  form.controls[key].markAsTouched();
});
}

/**
 * Persists the edited contact and closes the overlay with exit animation.
 * @returns {Promise<void>} Promise resolved after Firestore update completes.
 */
private async persistContactUpdate(): Promise<void> {
try {
  await this.fbService.updateContact(this.fbService.id, this.editedContact);
} catch (error) {
  this.handleSubmitError(error);
  return;
}
this.isClosing = true;
setTimeout(() => {
  this.fbService.showEditContact = false;
}, 400);
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
 * Returns a copy of the currently selected contact for editing.
 * @returns {IContact} Editable contact copy.
 */
getCurrentContact() {
this.editedContact = { ...this.fbService.currentContact };
return this.editedContact;
}

/**
 * Returns whether the desktop edit overlay is visible.
 * @returns {boolean} True when edit mode is active.
 */
getShowEditContact() {
return this.fbService.showEditContact;
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
 * Validates that field length does not exceed maximum allowed.
 * @param {string | undefined} value - Field value to validate.
 * @param {number} maxLength - Maximum allowed length.
 * @returns {boolean} True when length exceeds maximum.
 */
hasExceededMaxLength(value: string | undefined, maxLength: number): boolean {
if (!value) return false;
return value.length > maxLength;
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