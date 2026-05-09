import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class FbAuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private db = inject(Firestore);

  /**
   * Registers a new user account and initializes the corresponding self-contact.
   * @param {string} email - User email address.
   * @param {string} password - User password.
   * @param {string} name - Optional first name.
   * @param {string} surname - Optional surname.
   * @returns {Promise<void>} Promise resolved after sign-up flow completes.
   */
  async signUp(email: string, password: string, name = '', surname = '') {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      await this.ensureSelfContact(result.user, name, surname);
      await signOut(this.auth);
      this.router.navigate(['/login'], { queryParams: { email, password, signupSuccess: '1' } });
    } catch (error) {
      console.error('Sign-up error:', error);
      throw error;
    }
  }

  /**
   * Signs in with email/password and ensures a self-contact exists.
   * @param {string} email - User email address.
   * @param {string} password - User password.
   * @returns {Promise<void>} Promise resolved after login flow completes.
   */
  async login(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      await this.ensureSelfContact(result.user);
      this.router.navigate(['/summary']);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Signs out the current user and navigates to the login page.
   * @returns {Promise<void>} Promise resolved after logout flow completes.
   */
  async logout() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Returns the authenticated Firebase user id.
   * @returns {string | null} Current uid or null when unauthenticated.
   */
  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  /**
   * Deletes the currently authenticated Firebase account.
   * @returns {Promise<void>} Promise resolved after account deletion handling.
   */
  async deleteCurrentUserAccount(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    try {
      await deleteUser(user);
      this.router.navigate(['/login']);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        // Session is too old; user must authenticate again.
        await signOut(this.auth);
        this.router.navigate(['/login']);
      } else {
        console.error('Error deleting user account:', error);
        throw error;
      }
    }
  }

  /**
   * Ensures that a contact entry exists for the authenticated user.
   * @param {User} user - Authenticated Firebase user.
   * @param {string} name - Preferred first name.
   * @param {string} surname - Preferred surname.
   * @returns {Promise<void>} Promise resolved after self-contact check/creation.
   */
  private async ensureSelfContact(user: User, name = '', surname = ''): Promise<void> {
    try {
      const contactsCollection = collection(this.db, 'contacts');
      const q = query(contactsCollection, where('ownerId', '==', user.uid));
      const existing = await getDocs(q);
      const hasOwnEmail = existing.docs.some((docItem) => docItem.data()['email'] === user.email);
      if (hasOwnEmail) {
        return;
      }

      const fallbackName = this.getFallbackName(user.email || '');
      await addDoc(contactsCollection, {
        ownerId: user.uid,
        uid: user.uid,
        date: new Date(),
        color: this.getRandomColor(),
        name: name || fallbackName,
        surname: surname || '',
        email: user.email || '',
        phone: ''
      });
    } catch (error) {
      console.error('Error ensuring self contact:', error);
    }
  }

  /**
   * Checks whether an email is already present in contact records.
   * @param {string} email - Email address to check.
   * @returns {Promise<boolean>} True when the email is already registered.
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    const contactsCollection = collection(this.db, 'contacts');
    const q = query(contactsCollection, where('email', '==', email.trim().toLowerCase()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }


  /**
   * Derives a fallback display name from an email address.
   * @param {string} email - Email source for fallback name generation.
   * @returns {string} Capitalized local-part fallback name.
   */
  private getFallbackName(email: string): string {
    const local = email.split('@')[0] || 'User';
    if (!local) {
      return 'User';
    }
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  /**
   * Returns a random predefined avatar/contact color.
   * @returns {string} Hex color value.
   */
  private getRandomColor(): string {
    const colors = ['#FF7A00', '#9327FF', '#6E52FF', '#FC71FF', '#FFBB2B', '#1FD7C1', '#462F8A', '#FF4646', '#00BEE8', '#FF5EC4', '#3DFF8A'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
