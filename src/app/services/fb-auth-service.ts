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

  async signUp(email: string, password: string, name = '', surname = '') {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      await this.ensureSelfContact(result.user, name, surname);
      this.router.navigate(['/contacts']);
    } catch (error) {
      console.error('Sign-up error:', error);
      throw error; // Fehler weiterwerfen für UI-Handling
    }
  }

  async login(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      await this.ensureSelfContact(result.user);
      this.router.navigate(['/contacts']);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  /** Löscht den aktuell eingeloggten Auth-User und loggt aus. */
  async deleteCurrentUserAccount(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    try {
      await deleteUser(user);
      this.router.navigate(['/login']);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        // Session zu alt – User muss sich neu anmelden
        await signOut(this.auth);
        this.router.navigate(['/login']);
      } else {
        console.error('Error deleting user account:', error);
        throw error;
      }
    }
  }

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

  async isEmailRegistered(email: string): Promise<boolean> {
    const contactsCollection = collection(this.db, 'contacts');
    const q = query(contactsCollection, where('email', '==', email.trim().toLowerCase()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }


  private getFallbackName(email: string): string {
    const local = email.split('@')[0] || 'User';
    if (!local) {
      return 'User';
    }
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  private getRandomColor(): string {
    const colors = ['#FF7A00', '#9327FF', '#6E52FF', '#FC71FF', '#FFBB2B', '#1FD7C1', '#462F8A', '#FF4646', '#00BEE8', '#FF5EC4', '#3DFF8A'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
