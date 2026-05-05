import { Injectable, inject, HostListener, ComponentRef } from '@angular/core';
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

    onAuthStateChanged(this.auth, () => {
      this.applyOwnerFilter();
    });


    this.myData = onSnapshot(this.dataCollection, (snapshot) => {
      this.data = snapshot.docs.map((doc) => doc.data());
      //console.log(this.data);
    });

  }

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

  async addContact(contact: IContact) {
    this.pendingNewContactEmail = contact.email;
    await addDoc(this.contactsCollection, { ownerId: this.getCurrentUserId(), date: new Date(), color: this.getRandomColorOld(), ...contact });
  }

  async updateContact(id: number, contact: IContact) {
    await updateDoc(doc(this.contactsCollection, this.contactsArray[id].id), { ...contact });
  }

  firstConnect() {
    return Math.min(...this.i);
  }

  async updateOneField(id: string, field: string, value: number) {
    console.log(id, field, value);
    // this.i = this.i + 1;
    //if (this.i > this.contactsArray.length + 1) { this.i = 0; } console.log(this.i, `Updating contact ${id}, setting ${field} to ${value}`);
    //await updateDoc(doc(this.contactsCollection, this.contactsArray[id].id), { [field]: value });
  }

  /** Gibt false zurück wenn der Kontakt ein fremder registrierter User ist (nicht löschbar). */
  async delContact(id: number): Promise<boolean> {
    const contact = this.contactsArray[id];
    if (!contact) return false;
    const currentUserId = this.getCurrentUserId();
    // Fremder registrierter User → Löschen verweigern
    if (contact.uid && contact.uid !== currentUserId) return false;
    await deleteDoc(doc(this.contactsCollection, contact.id));
    // Eigener Account → Auth + users-Dokument ebenfalls löschen
    if (contact.uid && contact.uid === currentUserId) {
      await this.authService.deleteCurrentUserAccount();
    }
    this.id = this.firstConnect();
    return true;
  }

  onDestroy() {
    this.myContacts();
    this.myData();
  }

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

  getRandomColorOld() {
    const colors = ['#FF7A00', '#9327FF', '#6E52FF', '#FC71FF', '#FFBB2B', '#1FD7C1', '#462F8A', '#FF4646', '#00BEE8', '#FF5EC4', '#3DFF8A'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return randomColor;
  }

  saveToLocalStorage() {
    localStorage.setItem('JoinFirebase', JSON.stringify(this.contactsArray));
  }

  getCurrentUserId(): string {
    return this.authService.getCurrentUserId() || 'guest';
  }

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

  setCurrentContact(id: number): IContact {
    this.currentContact = this.contactsArray.length > 0 ? this.contactsArray[id] : { name: '', surname: '', email: '', phone: '' } as IContact;
    return this.currentContact;
  }

  refreshContactList() {
    setTimeout(() => {

      this.contactlistHidden = true;
    }, 500);
  }
}