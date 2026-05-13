import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, User, createUserWithEmailAndPassword, deleteUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { addDoc, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import { environment } from '../../environments/environment';
import { FbAuthTestDataService } from './fb-auth-test-data.service';
import { buildSelfContactPayload } from './fb-auth-contact.utils';

@Injectable({
  providedIn: 'root',
})
export class FbAuthService {
  private readonly loginStateStorageKey = 'join.loggedIn';
  private readonly dailyTestSyncLocks = new Map<string, Promise<void>>();
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly db = inject(Firestore);
  private readonly injector = inject(Injector);
  private readonly testDataService = inject(FbAuthTestDataService);

  /**
   * Registers a global auth-state listener to keep daily fixture data synchronized.
   * @returns {void} No return value.
   */
  constructor() {
    /**
     * Creates the auth-state listener inside Angular injection context.
     * @returns {void} No return value.
     */
    runInInjectionContext(this.injector, () => {
      /**
       * Triggers fixture sync whenever a valid Firebase user session is available.
       * @param {User | null} user - Current authenticated user.
       * @returns {void} No return value.
       */
      onAuthStateChanged(this.auth, (user) => {
        if (!user) return;
        this.syncDailyTestDataForUser(user).catch(() => undefined);
      });
    });
  }


  /**
   * Stores local login marker used for startup routing decisions.
   * @param {boolean} loggedIn - True when user session should be treated as active.
   * @returns {void} No return value.
   */
  private setLocalLoginState(loggedIn: boolean): void {
    localStorage.setItem(this.loginStateStorageKey, loggedIn ? '1' : '0');
  }


  /**
   * Returns whether local storage marks the user as logged in.
   * @returns {boolean} True when local login marker is active.
   */
  isLocallyLoggedIn(): boolean {
    return localStorage.getItem(this.loginStateStorageKey) === '1';
  }


  /**
   * Resolves startup target route based on local marker and Firebase auth state.
   * @returns {Promise<'/summary' | '/login'>} Target route for app startup.
   */
  async resolveStartupRoute(): Promise<'/summary' | '/login'> {
    if (!this.isLocallyLoggedIn()) return '/login';
    if (this.auth.currentUser) {
      await this.syncDailyTestDataForUser(this.auth.currentUser);
      return '/summary';
    }
    return this.resolveRouteFromAuthState();
  }


  /**
   * Resolves startup route from async Firebase auth-state emission.
   * @returns {Promise<'/summary' | '/login'>} Target route for app startup.
   */
  private resolveRouteFromAuthState(): Promise<'/summary' | '/login'> {
    return new Promise((resolve) => runInInjectionContext(this.injector, () => {
      const unsub = onAuthStateChanged(this.auth, this.createStartupAuthHandler(resolve, () => unsub()));
    }));
  }

  /**
   * Builds a one-shot auth-state handler for startup route resolution.
   * @param {(value: '/summary' | '/login') => void} resolve - Promise resolver callback.
   * @param {() => void} unsubscribe - Snapshot unsubscribe callback.
   * @returns {(user: User | null) => void} Auth-state handler function.
   */
  private createStartupAuthHandler(resolve: (value: '/summary' | '/login') => void, unsubscribe: () => void): (user: User | null) => void {
    return (user: User | null) => {
      unsubscribe();
      if (!user) {
        this.setLocalLoginState(false);
        resolve('/login');
        return;
      }
      this.syncAndResolveSummary(user, resolve);
    };
  }


  /**
   * Synchronizes data for a user and resolves to summary route regardless of sync outcome.
   * @param {User} user - Authenticated Firebase user.
   * @param {(value: '/summary') => void} resolve - Promise resolver callback.
   * @returns {void} No return value.
   */
  private syncAndResolveSummary(user: User, resolve: (value: '/summary') => void): void {
    this.syncDailyTestDataForUser(user)
      .finally(() => {
        this.setLocalLoginState(true);
        resolve('/summary');
      });
  }


  /**
   * Registers a new user account and initializes the corresponding self-contact.
   * @param {string} email - User email address.
   * @param {string} password - User password.
   * @param {string} name - Optional first name.
   * @param {string} surname - Optional surname.
   * @returns {Promise<void>} Promise resolved after sign-up flow completes.
   */
  async signUp(email: string, password: string, name = '', surname = ''): Promise<void> {
    try {
      const result = await this.createUserInContext(email, password);
      await this.ensureSelfContact(result.user, name, surname);
      await this.syncDailyTestDataForUser(result.user);
      await this.signOutInContext();
      this.setLocalLoginState(false);
      this.router.navigate(['/login'], { queryParams: { email, password, signupSuccess: '1' } });
    } catch (error) {
      throw error;
    }
  }


  /**
   * Signs in with email/password and ensures test fixtures are synchronized.
   * @param {string} email - User email address.
   * @param {string} password - User password.
   * @returns {Promise<void>} Promise resolved after login flow completes.
   */
  async login(email: string, password: string): Promise<void> {
    try {
      const result = await this.signInInContext(email, password);
      await this.syncDailyTestDataForUser(result.user);
      this.setLocalLoginState(true);
      this.router.navigate(['/summary']);
    } catch (error) {
      throw error;
    }
  }


  /**
   * Signs in with configured test-user credentials.
   * @returns {Promise<void>} Promise resolved after login flow completes.
   */
  async loginAsTestUser(): Promise<void> {
    const loginSucceeded = await this.tryLoginAsTestUser();
    if (loginSucceeded) return;
    await this.createAndLoginTestUser();
  }


  /**
   * Attempts to sign in with configured test-user credentials.
   * @returns {Promise<boolean>} True when login succeeded, false when account does not exist.
   */
  private async tryLoginAsTestUser(): Promise<boolean> {
    try {
      await this.login(environment.testUser.email, environment.testUser.password);
      return true;
    } catch (error: any) {
      const isNotFound =
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/user-not-found' ||
        error?.code === 'auth/invalid-login-credentials';
      if (!isNotFound) throw error;
      return false;
    }
  }


  /**
   * Creates test-user account when missing and signs in.
   * @returns {Promise<void>} Promise resolved after account creation or fallback login.
   */
  private async createAndLoginTestUser(): Promise<void> {
    try {
      const created = await this.createUserInContext(environment.testUser.email, environment.testUser.password);
      await this.syncDailyTestDataForUser(created.user);
      this.setLocalLoginState(true);
      this.router.navigate(['/summary']);
    } catch (createError: any) {
      if (createError?.code !== 'auth/email-already-in-use') throw createError;
      await this.login(environment.testUser.email, environment.testUser.password);
    }
  }


  /**
   * Forces daily test-data synchronization for current authenticated user.
   * @returns {Promise<void>} Promise resolved after sync is complete.
   */
  async forceSyncDailyTestDataForCurrentUser(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    await this.syncDailyTestDataForUser(user);
  }


  /**
   * Signs out current user and navigates to login page.
   * @returns {Promise<void>} Promise resolved after logout flow completes.
   */
  async logout(): Promise<void> {
    try {
      await this.signOutInContext();
      this.setLocalLoginState(false);
      this.router.navigate(['/login']);
    } catch {}
  }


  /**
   * Returns authenticated Firebase user id.
   * @returns {string | null} Current uid or null when unauthenticated.
   */
  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }


  /**
   * Returns authenticated Firebase user email.
   * @returns {string | null} Current email or null when unavailable.
   */
  getCurrentUserEmail(): string | null {
    return this.auth.currentUser?.email || null;
  }


  /**
   * Deletes current authenticated Firebase account.
   * @returns {Promise<void>} Promise resolved after deletion handling.
   */
  async deleteCurrentUserAccount(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    try {
      await this.deleteUserInContext(user);
      this.navigateAfterSignOut();
    } catch (error: any) {
      await this.handleDeleteUserError(error);
    }
  }


  /**
   * Clears local login state and navigates to login page.
   * @returns {void} No return value.
   */
  private navigateAfterSignOut(): void {
    this.setLocalLoginState(false);
    this.router.navigate(['/login']);
  }


  /**
   * Handles delete-account errors.
   * @param {any} error - Firebase error payload.
   * @returns {Promise<void>} Promise resolved after handling.
   */
  private async handleDeleteUserError(error: any): Promise<void> {
    if (error.code === 'auth/requires-recent-login') {
      await this.signOutInContext();
      this.navigateAfterSignOut();
      return;
    }
    throw error;
  }


  /**
   * Ensures a self-contact entry exists for authenticated user.
   * @param {User} user - Authenticated Firebase user.
   * @param {string} name - Preferred first name.
   * @param {string} surname - Preferred surname.
   * @returns {Promise<void>} Promise resolved after self-contact check/creation.
   */
  private async ensureSelfContact(user: User, name = '', surname = ''): Promise<void> {
    try {
      const contactsCollection = collection(this.db, 'contacts');
      const alreadyExists = await this.selfContactExists(contactsCollection, user);
      if (alreadyExists) return;
      await this.createSelfContact(contactsCollection, user, name, surname);
    } catch {}
  }


  /**
   * Checks whether a self-contact with user's email already exists.
   * @param {ReturnType<typeof collection>} contactsCollection - Firestore contacts collection reference.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<boolean>} True when a matching self-contact exists.
   */
  private async selfContactExists(
    contactsCollection: ReturnType<typeof collection>,
    user: User
  ): Promise<boolean> {
    const snapshot = await this.getDocsInContext(query(contactsCollection, where('ownerId', '==', user.uid)));
    return snapshot.docs.some((docItem) => (docItem.data() as Record<string, unknown>)['email'] === user.email);
  }


  /**
   * Creates a self-contact document for authenticated user.
   * @param {ReturnType<typeof collection>} contactsCollection - Firestore contacts collection reference.
   * @param {User} user - Authenticated Firebase user.
   * @param {string} name - Preferred first name.
   * @param {string} surname - Preferred surname.
   * @returns {Promise<void>} Promise resolved after contact creation.
   */
  private async createSelfContact(
    contactsCollection: ReturnType<typeof collection>,
    user: User,
    name: string,
    surname: string
  ): Promise<void> {
    const contactPayload = buildSelfContactPayload(user, name, surname);
    await this.addDocInContext(contactsCollection, contactPayload);
  }


  /**
   * Runs test data synchronization with per-user lock.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after sync completes.
   */
  private async syncDailyTestDataForUser(user: User): Promise<void> {
    const existingLock = this.dailyTestSyncLocks.get(user.uid);
    if (existingLock) {
      await existingLock;
      return;
    }
    await this.runExclusiveSyncJob(user);
  }


  /**
   * Executes lock-protected sync job.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after sync job completes.
   */
  private async runExclusiveSyncJob(user: User): Promise<void> {
    /**
     * Performs the serialized per-user self-contact and fixture synchronization flow.
     * @returns {Promise<void>} Promise resolved after sync steps are complete.
     */
    const syncJob = (async () => {
      await this.ensureSelfContact(user);
      await this.testDataService.ensureDailyTestData(user);
    })();

    this.dailyTestSyncLocks.set(user.uid, syncJob);
    try {
      await syncJob;
    } finally {
      this.dailyTestSyncLocks.delete(user.uid);
    }
  }


  /**
   * Checks whether an email is already present in contact records.
   * @param {string} email - Email address to check.
   * @returns {Promise<boolean>} True when email is already registered.
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    const contactsCollection = collection(this.db, 'contacts');
    const snapshot = await this.getDocsInContext(query(contactsCollection, where('email', '==', email.trim().toLowerCase())));
    return !snapshot.empty;
  }

  /**
   * Executes a Firestore getDocs query inside Angular injection context.
   * @param {Parameters<typeof getDocs>[0]} docsQuery - Firestore query reference.
   * @returns {Promise<Awaited<ReturnType<typeof getDocs>>>} Firestore query snapshot.
   */
  private getDocsInContext(
    docsQuery: Parameters<typeof getDocs>[0]
  ): Promise<Awaited<ReturnType<typeof getDocs>>> {
    /**
     * Executes getDocs within Angular injection context.
     * @returns {Promise<Awaited<ReturnType<typeof getDocs>>>} Firestore query snapshot.
     */
    return runInInjectionContext(this.injector, () => getDocs(docsQuery));
  }

  /**
   * Signs in a user in Angular injection context.
   * @param {string} email - User email address.
   * @param {string} password - User password.
   * @returns {Promise<Awaited<ReturnType<typeof signInWithEmailAndPassword>>>} Auth sign-in result.
   */
  private signInInContext(
    email: string,
    password: string
  ): Promise<Awaited<ReturnType<typeof signInWithEmailAndPassword>>> {
    /**
     * Executes email/password sign-in within Angular injection context.
     * @returns {Promise<Awaited<ReturnType<typeof signInWithEmailAndPassword>>>} Auth sign-in result.
     */
    return runInInjectionContext(this.injector, () => signInWithEmailAndPassword(this.auth, email, password));
  }

  /**
   * Creates a user account in Angular injection context.
   * @param {string} email - User email address.
   * @param {string} password - User password.
   * @returns {Promise<Awaited<ReturnType<typeof createUserWithEmailAndPassword>>>} Auth sign-up result.
   */
  private createUserInContext(
    email: string,
    password: string
  ): Promise<Awaited<ReturnType<typeof createUserWithEmailAndPassword>>> {
    /**
     * Executes account creation within Angular injection context.
     * @returns {Promise<Awaited<ReturnType<typeof createUserWithEmailAndPassword>>>} Auth sign-up result.
     */
    return runInInjectionContext(this.injector, () => createUserWithEmailAndPassword(this.auth, email, password));
  }

  /**
   * Signs out current user in Angular injection context.
   * @returns {Promise<void>} Promise resolved after sign-out.
   */
  private signOutInContext(): Promise<void> {
    return runInInjectionContext(this.injector, () => signOut(this.auth));
  }

  /**
   * Deletes a Firebase user in Angular injection context.
   * @param {User} user - User to delete.
   * @returns {Promise<void>} Promise resolved after deletion.
   */
  private deleteUserInContext(user: User): Promise<void> {
    return runInInjectionContext(this.injector, () => deleteUser(user));
  }

  /**
   * Creates a Firestore document in Angular injection context.
   * @param {Parameters<typeof addDoc>[0]} coll - Firestore collection reference.
   * @param {Parameters<typeof addDoc>[1]} payload - Document payload.
   * @returns {Promise<Awaited<ReturnType<typeof addDoc>>>} Created document reference.
   */
  private addDocInContext(
    coll: Parameters<typeof addDoc>[0],
    payload: Parameters<typeof addDoc>[1]
  ): Promise<Awaited<ReturnType<typeof addDoc>>> {
    /**
     * Executes addDoc within Angular injection context.
     * @returns {Promise<Awaited<ReturnType<typeof addDoc>>>} Created document reference.
     */
    return runInInjectionContext(this.injector, () => addDoc(coll, payload));
  }


}
