import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class FbAuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private db = inject(Firestore);

  async signUp(email: string, password: string, name: string, surname: string) {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      // Nach Sign-up User-Daten in Firestore speichern
      await this.saveUserToFirestore(result.user, name, surname);
      this.router.navigate(['/contacts']);
    } catch (error) {
      console.error('Sign-up error:', error);
      throw error; // Fehler weiterwerfen für UI-Handling
    }
  }

  async login(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
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

  private async saveUserToFirestore(user: User, name: string, surname: string) {
    try {
      const usersCollection = collection(this.db, 'users');
      await addDoc(usersCollection, {
        uid: user.uid,
        name: name,
        surname: surname,
        email: user.email,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
  }
}
