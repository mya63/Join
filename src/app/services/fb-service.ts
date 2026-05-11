import { Injectable, inject, HostListener, ComponentRef, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collectionData, collection, doc, onSnapshot, orderBy, query, where } from '@angular/fire/firestore';
import { addDoc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { IContact } from '../interfaces/i-contact';
import { environment } from '../../environments/environment';
import { Contacts } from '../contacts/contacts';
import { FbAuthService } from './fb-auth-service';

@Injectable({
  providedIn: 'root'
})
export class FbService {
  private db = inject(Firestore);
  private authService = inject(FbAuthService);
  private auth = inject(Auth);
  private injector = inject(Injector);

  contact: IContact;
  currentContact: IContact;
  contactsCollection = collection(this.db, 'contacts');
  contactsCollectionSorted = query(this.contactsCollection, orderBy('date', 'desc'));
  dataCollection = collection(this.db, 'data');


  myContacts;
  allContacts: IContact[] = [];
  contactsArray: IContact[] = [];
  contactsGroups: string[] = [];
  showEditContact: boolean = false;
  contactlistHidden = false;
  pendingNewContactEmail = '';
  myWidth: number = window.innerWidth;
  id: number = 0;
  i: number[] = [0];

  myData;
  data: any[] = [];

  constructor() {
    this.contact = {} as IContact;
    this.contactsArray = [];
    this.currentContact = { name: '', surname: '', email: '', phone: '' } as IContact;

    this.myContacts = this.bindContactsListener();
    this.bindAuthStateToOwnerFilter();
    this.myData = this.bindDataListener();
  }

  /**
   * Resets contact selection state for new user sessions.
   * Called after successful login to clear previous user's contact selection.
   * @returns {void} No return value.
   */
  resetContactState(): void {
    this.id = 0;
    this.currentContact = { name: '', surname: '', email: '', phone: '' } as IContact;
    this.showEditContact = false;
  }

  /**
   * Attaches a Firestore snapshot listener to the sorted contacts collection.
   * @returns {VoidFunction} Unsubscribe function for the snapshot listener.
   */
  private bindContactsListener(): VoidFunction {
    return onSnapshot(this.contactsCollectionSorted, (snapshot) => {
      this.allContacts = [];
      snapshot.forEach((element) => {
        this.allContacts.push({ id: element.id, ...element.data() } as IContact);
      });
      this.applyOwnerFilter();
    });
  }

  /**
   * Subscribes to Firebase auth state changes and re-applies owner filter on each change.
   * @returns {void} No return value.
   */
  private bindAuthStateToOwnerFilter(): void {
    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, () => {
        this.resetContactState();
        this.applyOwnerFilter();
      });
    });
  }

  /**
   * Attaches a Firestore snapshot listener to the data collection.
   * @returns {VoidFunction} Unsubscribe function for the snapshot listener.
   */
  private bindDataListener(): VoidFunction {
    return onSnapshot(this.dataCollection, (snapshot) => {
      this.data = snapshot.docs.map((document) => document.data());
    });
  }

  /**
   * Creates a contact model from primitive fields and persists it.
   * @param {string} name - Contact first name.
   * @param {string} surname - Contact surname.
   * @param {string} email - Contact email address.
   * @param {string} phone - Contact phone number.
   * @returns {void} No return value.
   */
  setAddContact(name: string, surname: string, email: string, phone: string) {
    this.contact = {
      name: name,
      surname: surname,
      email: email,
      phone: phone
    };
    this.addContact(this.contact);
  }

  /**
   * Persists a new contact document for the current owner scope.
   * @param {IContact} contact - Contact payload to create.
   * @returns {Promise<void>} Promise resolved after contact creation.
   */
  async addContact(contact: IContact) {
    const payload = this.withNormalizedContact(contact);
    if (this.hasEmailConflict(payload.email)) throw new Error('CONTACT_EMAIL_EXISTS');
    this.pendingNewContactEmail = payload.email;
    await addDoc(this.contactsCollection, {
      ownerId: this.getCurrentUserId(),
      date: new Date(),
      color: this.getRandomColorOld(),
      ...payload,
    });
  }

  /**
   * Updates an existing contact document by list index.
   * @param {number} id - Contact index in filtered array.
   * @param {IContact} contact - Updated contact payload.
   * @returns {Promise<void>} Promise resolved after contact update.
   */
  async updateContact(id: number, contact: IContact) {
    const current = this.contactsArray[id];
    if (!current?.id) return;
    const payload = this.withNormalizedContact(contact);
    if (this.hasEmailConflict(payload.email, current.id)) throw new Error('CONTACT_EMAIL_EXISTS');
    await updateDoc(doc(this.contactsCollection, current.id), { ...payload });
  }

  private withNormalizedContact(contact: IContact): IContact {
    return {
      ...contact,
      email: this.normalizeEmail(contact.email || ''),
      phone: this.normalizePhone(contact.phone || ''),
    };
  }

  private hasEmailConflict(email: string, excludeContactId = ''): boolean {
    const target = this.normalizeEmail(email);
    return this.contactsArray.some((contact) => {
      const sameEmail = this.normalizeEmail(contact.email || '') === target;
      const isOtherDoc = (contact.id || '') !== excludeContactId;
      return sameEmail && isOtherDoc;
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').trim();
  }

  /**
   * Returns the lowest tracked index helper value.
   * @returns {number} Minimum value of internal index tracker.
   */
  firstConnect() {
    return Math.min(...this.i);
  }

  /**
   * Debug helper for tracking single-field index updates.
   * @param {string} id - Contact id.
   * @param {string} field - Field name.
   * @param {number} value - Target value.
   * @returns {Promise<void>} Promise resolved after debug flow completes.
   */
  async updateOneField(id: string, field: string, value: number) {
    console.log(id, field, value);
  }

  /**
   * Deletes a contact and, when needed, the linked authenticated account.
   * @param {number} id - Contact index in filtered array.
   * @returns {Promise<boolean>} True when deletion succeeded.
   */
  async delContact(id: number): Promise<boolean> {
    const contact = this.contactsArray[id];
    if (!contact) return false;
    if (this.isForeignUserContact(contact)) return false;

    const isSelf = this.isSelfAccountContact(contact);
    await deleteDoc(doc(this.contactsCollection, contact.id));

    if (isSelf) {
      await this.authService.deleteCurrentUserAccount();
    }

    this.id = this.firstConnect();
    return true;
  }

  /**
   * Checks whether the given contact belongs to a different authenticated user.
   * @param {IContact} contact - Contact to evaluate.
   * @returns {boolean} True when the contact is owned by another user and must not be deleted.
   */
  private isForeignUserContact(contact: IContact): boolean {
    const currentUserId = this.getCurrentUserId();
    return !!(contact.uid && contact.uid !== currentUserId);
  }

  /**
   * Checks whether the given contact represents the currently authenticated user's own account.
   * @param {IContact} contact - Contact to evaluate.
   * @returns {boolean} True when the contact matches the logged-in user's uid and email.
   */
  private isSelfAccountContact(contact: IContact): boolean {
    const currentUserId = this.getCurrentUserId();
    const currentUserEmail = (this.authService.getCurrentUserEmail() || '').trim().toLowerCase();
    const contactEmail = (contact.email || '').trim().toLowerCase();
    return (
      Boolean(contact.uid) &&
      contact.uid === currentUserId &&
      !!currentUserEmail &&
      contactEmail === currentUserEmail
    );
  }

  /**
   * Unsubscribes active Firestore listeners.
   * @returns {void} No return value.
   */
  onDestroy() {
    this.myContacts();
    this.myData();
  }

  /**
   * Generates a random RGB-based color value.
   * @returns {string} Hex color string.
   */
  getRandomColor() {
    const r = Math.floor(Math.random() * 222);
    const g = Math.floor(Math.random() * 222);
    const b = Math.floor(Math.random() * 222);

    return `#${this.toHexColorComponent(r)}${this.toHexColorComponent(g)}${this.toHexColorComponent(b)}`;
  }

  /**
   * Converts a color channel value to a two-character hex representation.
   * @param {number} value - Color channel value.
   * @returns {string} Two-character hexadecimal channel value.
   */
  private toHexColorComponent(value: number): string {
    const hex = value.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  }

  /**
   * Returns a random color from the predefined palette.
   * @returns {string} Hex color string.
   */
  getRandomColorOld() {
    const colors = ['#FF7A00', '#9327FF', '#6E52FF', '#FC71FF', '#FFBB2B', '#1FD7C1', '#462F8A', '#FF4646', '#00BEE8', '#FF5EC4', '#3DFF8A'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return randomColor;
  }

  /**
   * Persists current contacts array in local storage.
   * @returns {void} No return value.
   */
  saveToLocalStorage() {
    localStorage.setItem('JoinFirebase', JSON.stringify(this.contactsArray));
  }

  /**
   * Returns current owner id, falling back to guest mode.
   * @returns {string} Authenticated uid or guest fallback id.
   */
  getCurrentUserId(): string {
    return this.authService.getCurrentUserId() || 'guest';
  }

  /**
   * Applies owner filtering and refreshes derived contact state.
   * @returns {void} No return value.
   */
  private applyOwnerFilter(): void {
    const userId = this.getCurrentUserId();
    const filterEnabled = environment.featureFlags?.enableOwnerFilter === true;
    this.contactsArray = filterEnabled
      ? this.allContacts.filter(contact => contact.ownerId === userId)
      : [...this.allContacts];

    this.rebuildContactGroups();
    this.resolveCurrentContact();
  }

  /**
   * Rebuilds the sorted list of unique first-letter group keys from the filtered contacts.
   * @returns {void} No return value.
   */
  private rebuildContactGroups(): void {
    this.contactsGroups = Array.from(
      new Set(
        this.contactsArray
          .map(contact => (contact.name || '').charAt(0).toUpperCase())
          .filter(Boolean)
      )
    ).sort();
  }

  /**
   * Selects the appropriate current contact after filter changes.
   * Handles empty list, pending new contact email, and out-of-bounds index.
   * @returns {void} No return value.
   */
  private resolveCurrentContact(): void {
    if (this.hasNoContacts()) {
      this.resetCurrentContact();
      return;
    }
    if (this.tryApplyPendingNewContact()) {
      return;
    }
    this.ensureValidCurrentIndex();
    this.currentContact = this.contactsArray[this.id];
  }

  /**
   * Checks whether the filtered contacts collection is empty.
   * @returns {boolean} True when no contacts are available.
   */
  private hasNoContacts(): boolean {
    return this.contactsArray.length === 0;
  }

  /**
   * Resets selected contact state to an empty fallback contact.
   * @returns {void} No return value.
   */
  private resetCurrentContact(): void {
    this.id = 0;
    this.currentContact = { name: '', surname: '', email: '', phone: '' } as IContact;
  }

  /**
   * Selects a newly created contact when pending email metadata is available.
   * @returns {boolean} True when pending contact was applied.
   */
  private tryApplyPendingNewContact(): boolean {
    if (!this.pendingNewContactEmail) return false;
    const newIdx = this.contactsArray.findIndex(c => c.email === this.pendingNewContactEmail);
    if (newIdx === -1) return false;
    this.id = newIdx;
    this.currentContact = this.contactsArray[newIdx];
    this.pendingNewContactEmail = '';
    return true;
  }

  /**
   * Clamps selected contact index into the filtered contacts array bounds.
   * @returns {void} No return value.
   */
  private ensureValidCurrentIndex(): void {
    if (this.id < 0 || this.id >= this.contactsArray.length) {
      this.id = 0;
    }
  }

  /**
   * Sets and returns the current contact by index.
   * @param {number} id - Contact index.
   * @returns {IContact} Selected contact or empty fallback contact.
   */
  setCurrentContact(id: number): IContact {
    this.currentContact = this.contactsArray.length > 0 ? this.contactsArray[id] : { name: '', surname: '', email: '', phone: '' } as IContact;
    return this.currentContact;
  }

  /**
   * Triggers delayed list-state refresh for mobile/overlay flows.
   * @returns {void} No return value.
   */
  refreshContactList() {
    setTimeout(() => {

      this.contactlistHidden = true;
    }, 500);
  }
}
