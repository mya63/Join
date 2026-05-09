import { Injectable, inject, HostListener, ComponentRef, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collectionData, collection, doc, onSnapshot, orderBy, query, where } from '@angular/fire/firestore';
import { addDoc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { IContact } from '../interfaces/i-contact';
import { environment } from '../../environments/environment';
//import { EditDesktop } from '../contacts/edit-desktop/edit-desktop';
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
  //contactsCollectionFiltered = query(this.contactsCollection, where('ownerId', '==', this.getCurrentUserId()));
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

    this.myContacts = onSnapshot(this.contactsCollectionSorted, (snapshot) => {
      this.allContacts = [];
      snapshot.forEach((element) => {
        this.allContacts.push({ id: element.id, ...element.data() } as IContact);
      });
      this.applyOwnerFilter();
    });

    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, () => {
        this.applyOwnerFilter();
      });
    });


    this.myData = onSnapshot(this.dataCollection, (snapshot) => {
      this.data = snapshot.docs.map((doc) => doc.data());
      //console.log(this.data);
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
    //console.log(this.contact);
    this.addContact(this.contact);
  }

  /**
   * Persists a new contact document for the current owner scope.
   * @param {IContact} contact - Contact payload to create.
   * @returns {Promise<void>} Promise resolved after contact creation.
   */
  async addContact(contact: IContact) {
    this.pendingNewContactEmail = contact.email;
    await addDoc(this.contactsCollection, { ownerId: this.getCurrentUserId(), date: new Date(), color: this.getRandomColorOld(), ...contact });
  }

  /**
   * Updates an existing contact document by list index.
   * @param {number} id - Contact index in filtered array.
   * @param {IContact} contact - Updated contact payload.
   * @returns {Promise<void>} Promise resolved after contact update.
   */
  async updateContact(id: number, contact: IContact) {
    await updateDoc(doc(this.contactsCollection, this.contactsArray[id].id), { ...contact });
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
    // this.i = this.i + 1;
    //if (this.i > this.contactsArray.length + 1) { this.i = 0; } console.log(this.i, `Updating contact ${id}, setting ${field} to ${value}`);
    //await updateDoc(doc(this.contactsCollection, this.contactsArray[id].id), { [field]: value });
  }

  /**
   * Deletes a contact and, when needed, the linked authenticated account.
   * @param {number} id - Contact index in filtered array.
   * @returns {Promise<boolean>} True when deletion succeeded.
   */
  async delContact(id: number): Promise<boolean> {
    const contact = this.contactsArray[id];
    if (!contact) return false;
    const currentUserId = this.getCurrentUserId();
    const currentUserEmail = (this.authService.getCurrentUserEmail() || '').trim().toLowerCase();
    const contactEmail = (contact.email || '').trim().toLowerCase();
    const isSelfAccountContact =
      Boolean(contact.uid) &&
      contact.uid === currentUserId &&
      !!currentUserEmail &&
      contactEmail === currentUserEmail;
    // Registered foreign user: deletion is not allowed.
    if (contact.uid && contact.uid !== currentUserId) return false;
    await deleteDoc(doc(this.contactsCollection, contact.id));
    // Own account: also remove authenticated account data.
    if (isSelfAccountContact) {
      await this.authService.deleteCurrentUserAccount();
    }
    this.id = this.firstConnect();
    return true;
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

    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`
    return color;
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

    this.contactsGroups = Array.from(
      new Set(this.contactsArray.map(contact => (contact.name || '').charAt(0).toUpperCase()).filter(Boolean))
    ).sort();

    if (this.contactsArray.length === 0) {
      this.id = 0;
      this.currentContact = { name: '', surname: '', email: '', phone: '' } as IContact;
      return;
    }

    if (this.pendingNewContactEmail) {
      const newIdx = this.contactsArray.findIndex(c => c.email === this.pendingNewContactEmail);
      if (newIdx !== -1) {
        this.id = newIdx;
        this.currentContact = this.contactsArray[newIdx];
        this.pendingNewContactEmail = '';
        return;
      }
    }

    if (this.id < 0 || this.id >= this.contactsArray.length) {
      this.id = 0;
    }

    this.currentContact = this.contactsArray[this.id];
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
