import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, User, onAuthStateChanged } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc, query, where, getDocs, deleteDoc } from '@angular/fire/firestore';
import { environment } from '../../environments/environment';

type TestContactTemplate = {
  key: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  color: string;
};

type TestTaskTemplate = {
  key: string;
  title: string;
  description: string;
  dueOffsetDays: number;
  status: 'to-do' | 'in-progress' | 'await-feedback' | 'done';
  priority: 'low' | 'medium' | 'urgent';
  category: { category: number; categoryProperties: { name: string; color: string }[] };
  subTasks: { subtaskTitle: string; subtaskCompleted: boolean; onEdit: boolean }[];
};

@Injectable({
  providedIn: 'root',
})
export class FbAuthService {
  private readonly loginStateStorageKey = 'join.loggedIn';
  private readonly dailyTestSyncLocks = new Map<string, Promise<void>>();
  private readonly testContacts: readonly TestContactTemplate[] = [
    { key: 'tc-01', name: 'Liam', surname: 'Carter', email: 'liam.carter@join.local', phone: '+49 151 90000001', color: '#FF7A00' },
    { key: 'tc-02', name: 'Emma', surname: 'Fischer', email: 'emma.fischer@join.local', phone: '+49 151 90000002', color: '#9327FF' },
    { key: 'tc-03', name: 'Noah', surname: 'Becker', email: 'noah.becker@join.local', phone: '+49 151 90000003', color: '#6E52FF' },
    { key: 'tc-04', name: 'Mia', surname: 'Wagner', email: 'mia.wagner@join.local', phone: '+49 151 90000004', color: '#FC71FF' },
    { key: 'tc-05', name: 'Elias', surname: 'Schmidt', email: 'elias.schmidt@join.local', phone: '+49 151 90000005', color: '#FFBB2B' },
    { key: 'tc-06', name: 'Sofia', surname: 'Keller', email: 'sofia.keller@join.local', phone: '+49 151 90000006', color: '#1FD7C1' },
    { key: 'tc-07', name: 'Jonas', surname: 'Hartmann', email: 'jonas.hartmann@join.local', phone: '+49 151 90000007', color: '#462F8A' },
    { key: 'tc-08', name: 'Lina', surname: 'Krause', email: 'lina.krause@join.local', phone: '+49 151 90000008', color: '#FF4646' },
    { key: 'tc-09', name: 'Finn', surname: 'Neumann', email: 'finn.neumann@join.local', phone: '+49 151 90000009', color: '#00BEE8' },
    { key: 'tc-10', name: 'Hannah', surname: 'Wolf', email: 'hannah.wolf@join.local', phone: '+49 151 90000010', color: '#FF5EC4' }
  ];
  private readonly testTasks: readonly TestTaskTemplate[] = [
    {
      key: 'tt-01',
      title: 'Prepare onboarding package',
      description: 'Collect access data, profile details and welcome material for the new teammate.',
      dueOffsetDays: 1,
      status: 'to-do',
      priority: 'medium',
      category: { category: 1, categoryProperties: [{ name: 'User Story', color: '#0038FF' }] },
      subTasks: [
        { subtaskTitle: 'Create workspace account', subtaskCompleted: false, onEdit: false },
        { subtaskTitle: 'Share onboarding checklist', subtaskCompleted: false, onEdit: false }
      ]
    },
    {
      key: 'tt-02',
      title: 'Design login banner',
      description: 'Draft responsive login banner variants and prepare final export assets.',
      dueOffsetDays: 2,
      status: 'in-progress',
      priority: 'urgent',
      category: { category: 2, categoryProperties: [{ name: 'Design', color: '#1FD7C1' }] },
      subTasks: [
        { subtaskTitle: 'Create desktop version', subtaskCompleted: true, onEdit: false },
        { subtaskTitle: 'Create mobile version', subtaskCompleted: false, onEdit: false }
      ]
    },
    {
      key: 'tt-03',
      title: 'Implement contact search',
      description: 'Add debounced search logic and ensure empty-state behavior is correct.',
      dueOffsetDays: 3,
      status: 'await-feedback',
      priority: 'medium',
      category: { category: 3, categoryProperties: [{ name: 'Technical Task', color: '#9327FF' }] },
      subTasks: [
        { subtaskTitle: 'Add search input signal', subtaskCompleted: true, onEdit: false },
        { subtaskTitle: 'Validate filtering in contacts list', subtaskCompleted: true, onEdit: false }
      ]
    },
    {
      key: 'tt-04',
      title: 'Write regression checklist',
      description: 'Document key board and contact flows for pre-release validation.',
      dueOffsetDays: 4,
      status: 'to-do',
      priority: 'low',
      category: { category: 4, categoryProperties: [{ name: 'Review', color: '#FF7A00' }] },
      subTasks: [
        { subtaskTitle: 'List smoke test cases', subtaskCompleted: false, onEdit: false },
        { subtaskTitle: 'Define pass/fail criteria', subtaskCompleted: false, onEdit: false }
      ]
    },
    {
      key: 'tt-05',
      title: 'Release prep sync',
      description: 'Summarize open blockers and align final release timeline with team leads.',
      dueOffsetDays: 5,
      status: 'done',
      priority: 'urgent',
      category: { category: 5, categoryProperties: [{ name: 'Management', color: '#FF5EC4' }] },
      subTasks: [
        { subtaskTitle: 'Prepare agenda', subtaskCompleted: true, onEdit: false },
        { subtaskTitle: 'Share action items', subtaskCompleted: true, onEdit: false }
      ]
    }
  ];
  private auth = inject(Auth);
  private router = inject(Router);
  private db = inject(Firestore);
  private injector = inject(Injector);

  constructor() {
    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, (user) => {
        if (!user) {
          return;
        }

        runInInjectionContext(this.injector, () => {
          this.syncDailyTestDataForUser(user).catch((error) => {
            console.error('Error during auth-state test data sync:', error);
          });
        });
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
    if (!this.isLocallyLoggedIn()) {
      return '/login';
    }

    if (this.auth.currentUser) {
      await this.syncDailyTestDataForUser(this.auth.currentUser);
      return '/summary';
    }

    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(this.auth, (user) => {
        unsub();
        if (user) {
          runInInjectionContext(this.injector, () => {
            this.syncDailyTestDataForUser(user)
              .then(() => {
                this.setLocalLoginState(true);
                resolve('/summary');
              })
              .catch(() => {
                this.setLocalLoginState(true);
                resolve('/summary');
              });
          });
        } else {
          this.setLocalLoginState(false);
          resolve('/login');
        }
      });
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
  async signUp(email: string, password: string, name = '', surname = '') {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      await this.ensureSelfContact(result.user, name, surname);
      await signOut(this.auth);
      this.setLocalLoginState(false);
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
      await this.syncDailyTestDataForUser(result.user);
      this.setLocalLoginState(true);
      this.router.navigate(['/summary']);
    } catch (error) {
      console.error('Login error:', error);
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
   * Attempts to sign in with the configured test-user credentials.
   * @returns {Promise<boolean>} True when login succeeded, false when account does not exist.
   * @throws When an unexpected Firebase error occurs.
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
   * Creates the test-user account when it does not exist yet and navigates to summary.
   * Falls back to a plain login attempt when the account already exists.
   * @returns {Promise<void>} Promise resolved after account creation and login.
   */
  private async createAndLoginTestUser(): Promise<void> {
    try {
      const created = await createUserWithEmailAndPassword(
        this.auth, environment.testUser.email, environment.testUser.password
      );
      await this.syncDailyTestDataForUser(created.user);
      this.setLocalLoginState(true);
      this.router.navigate(['/summary']);
    } catch (createError: any) {
      if (createError?.code !== 'auth/email-already-in-use') throw createError;
      await this.login(environment.testUser.email, environment.testUser.password);
    }
  }

  /**
   * Forces daily test-data synchronization for the currently authenticated user.
   * @returns {Promise<void>} Promise resolved after sync is complete.
   */
  async forceSyncDailyTestDataForCurrentUser(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }
    await this.syncDailyTestDataForUser(user);
  }

  /**
   * Signs out the current user and navigates to the login page.
   * @returns {Promise<void>} Promise resolved after logout flow completes.
   */
  async logout() {
    try {
      await signOut(this.auth);
      this.setLocalLoginState(false);
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
   * Returns the authenticated Firebase user email.
   * @returns {string | null} Current email or null when unavailable.
   */
  getCurrentUserEmail(): string | null {
    return this.auth.currentUser?.email || null;
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
      this.navigateAfterSignOut();
    } catch (error: any) {
      await this.handleDeleteUserError(error);
    }
  }

  /**
   * Clears local login state and navigates to the login page.
   * @returns {void} No return value.
   */
  private navigateAfterSignOut(): void {
    this.setLocalLoginState(false);
    this.router.navigate(['/login']);
  }

  /**
   * Handles errors thrown during account deletion.
   * Signs out and redirects when the session is too old; rethrows all other errors.
   * @param {any} error - Firebase error payload.
   * @returns {Promise<void>} Promise resolved after error handling.
   */
  private async handleDeleteUserError(error: any): Promise<void> {
    if (error.code === 'auth/requires-recent-login') {
      await signOut(this.auth);
      this.navigateAfterSignOut();
    } else {
      console.error('Error deleting user account:', error);
      throw error;
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
      const alreadyExists = await this.selfContactExists(contactsCollection, user);
      if (alreadyExists) return;
      await this.createSelfContact(contactsCollection, user, name, surname);
    } catch (error) {
      console.error('Error ensuring self contact:', error);
    }
  }

  /**
   * Checks whether a self-contact with the user's own email already exists.
   * @param {ReturnType<typeof collection>} contactsCollection - Firestore contacts collection reference.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<boolean>} True when a matching self-contact exists.
   */
  private async selfContactExists(
    contactsCollection: ReturnType<typeof collection>,
    user: User
  ): Promise<boolean> {
    const q = query(contactsCollection, where('ownerId', '==', user.uid));
    const existing = await getDocs(q);
    return existing.docs.some((docItem) => docItem.data()['email'] === user.email);
  }

  /**
   * Creates a new self-contact document for the authenticated user.
   * @param {ReturnType<typeof collection>} contactsCollection - Firestore contacts collection reference.
   * @param {User} user - Authenticated Firebase user.
   * @param {string} name - Preferred first name.
   * @param {string} surname - Preferred surname.
   * @returns {Promise<void>} Promise resolved after the contact document is created.
   */
  private async createSelfContact(
    contactsCollection: ReturnType<typeof collection>,
    user: User,
    name: string,
    surname: string
  ): Promise<void> {
    const contactPayload = this.buildSelfContactPayload(user, name, surname);
    await addDoc(contactsCollection, contactPayload);
  }

  /**
   * Builds the contact payload for the authenticated user.
   * @param {User} user - Authenticated Firebase user.
   * @param {string} name - Preferred first name.
   * @param {string} surname - Preferred surname.
   * @returns {Record<string, unknown>} Firestore payload for self-contact creation.
   */
  private buildSelfContactPayload(user: User, name: string, surname: string): Record<string, unknown> {
    const fallbackName = this.getFallbackName(user.email || '');
    return {
      ownerId: user.uid, uid: user.uid, date: new Date(), color: this.getRandomColor(),
      name: name || fallbackName, surname: surname || '', email: user.email || '', phone: ''
    };
  }

  /**
   * Ensures that exactly ten predefined test contacts exist for the current day.
   * If the daily set is incomplete or outdated, all existing test contacts are replaced.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after validation/reset of test contacts.
   */
  private async ensureDailyTestContacts(user: User): Promise<void> {
    try {
      const contactsCollection = collection(this.db, 'contacts');
      const managedDocs = await this.loadManagedTestContactDocs(contactsCollection, user.uid);
      if (this.isDailyTestContactsComplete(managedDocs)) return;
      await this.recreateManagedTestContacts(contactsCollection, managedDocs, user.uid);
    } catch (error) {
      console.error('Error ensuring daily test contacts:', error);
      throw error;
    }
  }

  /**
   * Loads contact documents that belong to the managed test-contact set.
   * @param {ReturnType<typeof collection>} contactsCollection - Firestore contacts collection reference.
   * @param {string} ownerId - Owner id used to scope contacts.
   * @returns {Promise<Awaited<ReturnType<typeof getDocs>>['docs']>} Managed test-contact documents.
   */
  private async loadManagedTestContactDocs(
    contactsCollection: ReturnType<typeof collection>,
    ownerId: string
  ): Promise<Awaited<ReturnType<typeof getDocs>>['docs']> {
    const ownerContacts = await getDocs(query(contactsCollection, where('ownerId', '==', ownerId)));
    return ownerContacts.docs.filter((docItem) => this.isManagedTestContactDoc(docItem.data()));
  }

  /**
   * Checks whether a contact document belongs to configured test contacts.
   * @param {Record<string, unknown>} data - Firestore contact data.
   * @returns {boolean} True when the contact is a managed test contact.
   */
  private isManagedTestContactDoc(data: Record<string, unknown>): boolean {
    const email = String(data['email'] ?? '').toLowerCase();
    return this.isKnownOrLegacyTestEmail(email);
  }

  /**
   * Checks whether an email belongs to known or legacy test-contact domains.
   * @param {string} email - Lower-cased email.
   * @returns {boolean} True when email belongs to a managed test contact.
   */
  private isKnownOrLegacyTestEmail(email: string): boolean {
    const knownEmails = new Set(this.testContacts.map((contact) => contact.email.toLowerCase()));
    const legacyEmails = new Set(this.testContacts.map((c) => c.email.toLowerCase().replace('@join.local', '@test.join.local')));
    return knownEmails.has(email) || legacyEmails.has(email);
  }

  /**
   * Validates whether managed test contacts are complete and dated for today.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} docs - Managed test-contact documents.
   * @returns {boolean} True when test contacts are complete for the current day.
   */
  private isDailyTestContactsComplete(docs: Awaited<ReturnType<typeof getDocs>>['docs']): boolean {
    const todayKey = this.getTodayKey();
    const existingEmails = new Set(docs.map((docItem) => String(this.toRecord(docItem.data())['email'] ?? '').toLowerCase()).filter(Boolean));
    const hasTodayDates = docs.every((docItem) => this.getDayKeyFromUnknown(this.toRecord(docItem.data())['date']) === todayKey);
    const hasAllEmails = this.testContacts.every((contact) => existingEmails.has(contact.email.toLowerCase()));
    return docs.length === this.testContacts.length && hasTodayDates && hasAllEmails;
  }

  /**
   * Replaces managed test contacts with today's canonical fixtures.
   * @param {ReturnType<typeof collection>} contactsCollection - Firestore contacts collection reference.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} managedDocs - Existing managed test-contact documents.
   * @param {string} ownerId - Owner id for newly created test contacts.
   * @returns {Promise<void>} Promise resolved after recreation completes.
   */
  private async recreateManagedTestContacts(
    contactsCollection: ReturnType<typeof collection>,
    managedDocs: Awaited<ReturnType<typeof getDocs>>['docs'],
    ownerId: string
  ): Promise<void> {
    await Promise.all(managedDocs.map((docItem) => deleteDoc(docItem.ref)));
    const createJobs = this.testContacts.map((contact) => addDoc(contactsCollection, this.buildTestContactPayload(contact, ownerId)));
    await Promise.all(createJobs);
  }

  /**
   * Builds Firestore payload for a test contact document.
   * @param {TestContactTemplate} contact - Test contact template.
   * @param {string} ownerId - Owner id to assign.
   * @returns {Record<string, unknown>} Firestore payload object.
   */
  private buildTestContactPayload(contact: TestContactTemplate, ownerId: string): Record<string, unknown> {
    return { ownerId, uid: ownerId, date: new Date(), color: contact.color, name: contact.name, surname: contact.surname, email: contact.email, phone: contact.phone };
  }

  /**
   * Ensures that exactly five predefined test tasks exist for the current day.
   * If the daily set is incomplete or outdated, all existing test tasks are replaced.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after validation/reset of test tasks.
   */
  private async ensureDailyTestTasks(user: User): Promise<void> {
    try {
      const tasksCollection = collection(this.db, 'tasks');
      const managedDocs = await this.loadManagedTestTaskDocs(tasksCollection, user.uid);
      if (this.isDailyTestTasksComplete(managedDocs)) return;
      await this.recreateManagedTestTasks(tasksCollection, managedDocs, user.uid);
    } catch (error) {
      console.error('Error ensuring daily test tasks:', error);
      throw error;
    }
  }

  /**
   * Loads task documents that belong to the managed test-task set.
   * @param {ReturnType<typeof collection>} tasksCollection - Firestore tasks collection reference.
   * @param {string} ownerId - Owner id used to scope tasks.
   * @returns {Promise<Awaited<ReturnType<typeof getDocs>>['docs']>} Managed test-task documents.
   */
  private async loadManagedTestTaskDocs(
    tasksCollection: ReturnType<typeof collection>,
    ownerId: string
  ): Promise<Awaited<ReturnType<typeof getDocs>>['docs']> {
    const ownerTasks = await getDocs(query(tasksCollection, where('ownerId', '==', ownerId)));
    const knownTitles = new Set(this.testTasks.map((task) => task.title));
    return ownerTasks.docs.filter((docItem) => knownTitles.has(String(docItem.data()['title'] ?? '')));
  }

  /**
   * Validates whether managed test tasks are complete and dated for today.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} docs - Managed test-task documents.
   * @returns {boolean} True when test tasks are complete for the current day.
   */
  private isDailyTestTasksComplete(docs: Awaited<ReturnType<typeof getDocs>>['docs']): boolean {
    const todayKey = this.getTodayKey();
    const existingTitles = new Set(docs.map((docItem) => String(this.toRecord(docItem.data())['title'] ?? '')).filter(Boolean));
    const hasTodayDates = docs.every((docItem) => this.getDayKeyFromUnknown(this.toRecord(docItem.data())['createDate']) === todayKey);
    const hasAllTitles = this.testTasks.every((task) => existingTitles.has(task.title));
    return docs.length === this.testTasks.length && hasTodayDates && hasAllTitles;
  }

  /**
   * Replaces managed test tasks with today's canonical fixtures.
   * @param {ReturnType<typeof collection>} tasksCollection - Firestore tasks collection reference.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} managedDocs - Existing managed test-task documents.
   * @param {string} ownerId - Owner id for newly created test tasks.
   * @returns {Promise<void>} Promise resolved after recreation completes.
   */
  private async recreateManagedTestTasks(
    tasksCollection: ReturnType<typeof collection>,
    managedDocs: Awaited<ReturnType<typeof getDocs>>['docs'],
    ownerId: string
  ): Promise<void> {
    await Promise.all(managedDocs.map((docItem) => deleteDoc(docItem.ref)));
    const createJobs = this.testTasks.map((taskTemplate, index) => addDoc(tasksCollection, this.buildTestTaskPayload(taskTemplate, ownerId, index)));
    await Promise.all(createJobs);
  }

  /**
   * Builds Firestore payload for a test task document.
   * @param {TestTaskTemplate} taskTemplate - Test task template.
   * @param {string} ownerId - Owner id to assign.
   * @param {number} index - Position index in seeded list.
   * @returns {Record<string, unknown>} Firestore payload object.
   */
  private buildTestTaskPayload(taskTemplate: TestTaskTemplate, ownerId: string, index: number): Record<string, unknown> {
    return {
      createDate: new Date().toISOString(), ownerId, completed: taskTemplate.status === 'done', dueDate: this.getIsoDateWithOffset(taskTemplate.dueOffsetDays),
      status: taskTemplate.status, positionIndex: index, category: taskTemplate.category, title: taskTemplate.title,
      description: taskTemplate.description, assignTo: [], priority: taskTemplate.priority, subTasks: taskTemplate.subTasks
    };
  }

  /**
   * Ensures all daily test fixtures are present for the authenticated user.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved when all test data checks finish.
   */
  private async ensureDailyTestData(user: User): Promise<void> {
    await this.cleanupTestDataForOtherOwners(user.uid);
    if (await this.hasAnyTodayTestContact(user.uid)) {
      return;
    }
    await this.ensureDailyTestContacts(user);
    await this.ensureDailyTestTasks(user);
  }

  /**
   * Checks whether at least one predefined test contact exists for today.
   * @param {string} ownerId - Owner id to validate.
   * @returns {Promise<boolean>} True when at least one today's test contact exists.
   */
  private async hasAnyTodayTestContact(ownerId: string): Promise<boolean> {
    return runInInjectionContext(this.injector, async () => {
      const contactsCollection = collection(this.db, 'contacts');
      const testEmails = this.testContacts.map((contact) => contact.email.toLowerCase());
      const matches = await getDocs(
        query(
          contactsCollection,
          where('ownerId', '==', ownerId),
          where('email', 'in', testEmails)
        )
      );
      const todayKey = this.getTodayKey();
      return matches.docs.some((docItem) => this.getDayKeyFromUnknown(docItem.data()['date']) === todayKey);
    });
  }

  /**
   * Deletes test fixtures owned by other users to keep one canonical test dataset.
   * @param {string} currentOwnerId - Owner id that should retain test fixtures.
   * @returns {Promise<void>} Promise resolved after duplicate fixture cleanup.
   */
  private async cleanupTestDataForOtherOwners(currentOwnerId: string): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const contactsCollection = collection(this.db, 'contacts');
      const tasksCollection = collection(this.db, 'tasks');
      const [matchingContacts, matchingTasks] = await this.loadMatchingTestFixtures(contactsCollection, tasksCollection);
      const deleteJobs = this.collectForeignFixtureDeleteJobs(matchingContacts.docs, matchingTasks.docs, currentOwnerId);
      if (deleteJobs.length > 0) {
        await Promise.all(deleteJobs);
      }
    });
  }

  /**
   * Loads contact and task documents that match known test fixture identifiers.
   * @param {ReturnType<typeof collection>} contactsCollection - Contacts collection reference.
   * @param {ReturnType<typeof collection>} tasksCollection - Tasks collection reference.
   * @returns {Promise<[Awaited<ReturnType<typeof getDocs>>, Awaited<ReturnType<typeof getDocs>>]>} Matching docs tuple.
   */
  private loadMatchingTestFixtures(
    contactsCollection: ReturnType<typeof collection>,
    tasksCollection: ReturnType<typeof collection>
  ): Promise<[Awaited<ReturnType<typeof getDocs>>, Awaited<ReturnType<typeof getDocs>>]> {
    const testEmails = this.testContacts.map((contact) => contact.email.toLowerCase());
    const testTitles = this.testTasks.map((task) => task.title);
    return Promise.all([
      getDocs(query(contactsCollection, where('email', 'in', testEmails))),
      getDocs(query(tasksCollection, where('title', 'in', testTitles)))
    ]);
  }

  /**
   * Collects delete jobs for fixture documents that belong to other owners.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} contactDocs - Matching contact documents.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} taskDocs - Matching task documents.
   * @param {string} currentOwnerId - Owner id that should be retained.
   * @returns {Array<Promise<void>>} Delete jobs for foreign-owner fixtures.
   */
  private collectForeignFixtureDeleteJobs(
    contactDocs: Awaited<ReturnType<typeof getDocs>>['docs'],
    taskDocs: Awaited<ReturnType<typeof getDocs>>['docs'],
    currentOwnerId: string
  ): Array<Promise<void>> {
    return [...this.collectForeignOwnerDeletes(contactDocs, currentOwnerId), ...this.collectForeignOwnerDeletes(taskDocs, currentOwnerId)];
  }

  /**
   * Collects delete jobs for documents owned by users other than current owner.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} docs - Matching fixture documents.
   * @param {string} currentOwnerId - Owner id that should be retained.
   * @returns {Array<Promise<void>>} Delete jobs for foreign-owner documents.
   */
  private collectForeignOwnerDeletes(
    docs: Awaited<ReturnType<typeof getDocs>>['docs'],
    currentOwnerId: string
  ): Array<Promise<void>> {
    return docs
      .filter((docItem) => this.isForeignOwner(this.toRecord(docItem.data()), currentOwnerId))
      .map((docItem) => deleteDoc(docItem.ref));
  }

  /**
   * Converts unknown Firestore data into a record for safe keyed access.
   * @param {unknown} value - Unknown Firestore payload.
   * @returns {Record<string, unknown>} Record view of payload data.
   */
  private toRecord(value: unknown): Record<string, unknown> {
    return (value ?? {}) as Record<string, unknown>;
  }

  /**
   * Checks whether the document data belongs to a different owner.
   * @param {Record<string, unknown>} data - Firestore document data.
   * @param {string} currentOwnerId - Owner id that should be retained.
   * @returns {boolean} True when the document belongs to another owner.
   */
  private isForeignOwner(data: Record<string, unknown>, currentOwnerId: string): boolean {
    const ownerId = String(data['ownerId'] ?? '');
    return !!ownerId && ownerId !== currentOwnerId;
  }

  /**
   * Runs test data synchronization for a user while preventing parallel duplicate writes.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after synchronized test data update.
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
   * Executes the sync job under a per-user lock to prevent concurrent duplicate writes.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after self-contact and test data sync complete.
   */
  private async runExclusiveSyncJob(user: User): Promise<void> {
    const syncJob = (async () => {
      await this.ensureSelfContact(user);
      await this.ensureDailyTestData(user);
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
   * Returns a local date key in YYYY-MM-DD format.
   * @returns {string} Date key for day-based comparisons.
   */
  private getTodayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns an ISO date string for today plus an offset in days.
   * @param {number} dayOffset - Number of days to add.
   * @returns {string} ISO date string.
   */
  private getIsoDateWithOffset(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString();
  }

  /**
   * Converts Firestore date-like values to a YYYY-MM-DD local day key.
   * @param {unknown} value - Unknown date source (Date, ISO string, or Firestore Timestamp-like object).
   * @returns {string | null} Date key or null when value cannot be parsed.
   */
  private getDayKeyFromUnknown(value: unknown): string | null {
    const parsedDate = this.parseUnknownDate(value);
    return parsedDate ? this.toDayKey(parsedDate) : null;
  }

  /**
   * Parses unknown date-like values into a valid Date instance.
   * @param {unknown} value - Unknown date source.
   * @returns {Date | null} Parsed date or null when unsupported.
   */
  private parseUnknownDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string') return this.parseDateString(value);
    return this.parseTimestampLike(value);
  }

  /**
   * Parses an ISO-like date string into Date when valid.
   * @param {string} value - Date string.
   * @returns {Date | null} Parsed date or null when invalid.
   */
  private parseDateString(value: string): Date | null {
    const candidate = new Date(value);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  /**
   * Parses Firestore timestamp-like objects into Date when available.
   * @param {unknown} value - Timestamp-like object.
   * @returns {Date | null} Parsed date or null when unavailable.
   */
  private parseTimestampLike(value: unknown): Date | null {
    if (!value || typeof value !== 'object') return null;
    if (!('toDate' in (value as Record<string, unknown>))) return null;
    const timestampLike = value as { toDate?: () => Date };
    if (typeof timestampLike.toDate !== 'function') return null;
    const candidate = timestampLike.toDate();
    return candidate instanceof Date && !Number.isNaN(candidate.getTime()) ? candidate : null;
  }

  /**
   * Converts a Date instance to YYYY-MM-DD local key format.
   * @param {Date} date - Date to convert.
   * @returns {string} Day key string.
   */
  private toDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
