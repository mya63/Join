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
    try {
      await this.login(environment.testUser.email, environment.testUser.password);
      return;
    } catch (error: any) {
      const canCreateAfterFailedLogin =
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/user-not-found' ||
        error?.code === 'auth/invalid-login-credentials';
      if (!canCreateAfterFailedLogin) {
        throw error;
      }
    }

    try {
      const created = await createUserWithEmailAndPassword(this.auth, environment.testUser.email, environment.testUser.password);
      await this.syncDailyTestDataForUser(created.user);
      this.setLocalLoginState(true);
      this.router.navigate(['/summary']);
    } catch (createError: any) {
      if (createError?.code !== 'auth/email-already-in-use') {
        throw createError;
      }
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
      this.setLocalLoginState(false);
      this.router.navigate(['/login']);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        // Session is too old; user must authenticate again.
        await signOut(this.auth);
        this.setLocalLoginState(false);
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
   * Ensures that exactly ten predefined test contacts exist for the current day.
   * If the daily set is incomplete or outdated, all existing test contacts are replaced.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after validation/reset of test contacts.
   */
  private async ensureDailyTestContacts(user: User): Promise<void> {
    try {
      const contactsCollection = collection(this.db, 'contacts');
      const ownerContactsQuery = query(contactsCollection, where('ownerId', '==', user.uid));
      const ownerContacts = await getDocs(ownerContactsQuery);
      const todayKey = this.getTodayKey();
      const knownTestEmails = new Set(this.testContacts.map((contact) => contact.email.toLowerCase()));
      const legacyTestEmails = new Set(
        this.testContacts.map((contact) => contact.email.toLowerCase().replace('@join.local', '@test.join.local'))
      );
      const managedTestContacts = ownerContacts.docs.filter((docItem) => {
        const data = docItem.data();
        const email = String(data['email'] ?? '').toLowerCase();
        return knownTestEmails.has(email) || legacyTestEmails.has(email);
      });
      const existingEmails = new Set(
        managedTestContacts
          .map((docItem) => String(docItem.data()['email'] ?? '').toLowerCase())
          .filter(Boolean)
      );

      const isCompleteForToday =
        managedTestContacts.length === this.testContacts.length &&
        managedTestContacts.every((docItem) => this.getDayKeyFromUnknown(docItem.data()['date']) === todayKey) &&
        this.testContacts.every((contact) => existingEmails.has(contact.email.toLowerCase()));

      if (isCompleteForToday) {
        return;
      }

      await Promise.all(managedTestContacts.map((docItem) => deleteDoc(docItem.ref)));

      const createTestContactsJobs = this.testContacts.map((contact) =>
        addDoc(contactsCollection, {
          ownerId: user.uid,
          uid: user.uid,
          date: new Date(),
          color: contact.color,
          name: contact.name,
          surname: contact.surname,
          email: contact.email,
          phone: contact.phone
        })
      );
      await Promise.all(createTestContactsJobs);
    } catch (error) {
      console.error('Error ensuring daily test contacts:', error);
      throw error;
    }
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
      const ownerTasksQuery = query(tasksCollection, where('ownerId', '==', user.uid));
      const ownerTasks = await getDocs(ownerTasksQuery);
      const todayKey = this.getTodayKey();
      const knownTestTitles = new Set(this.testTasks.map((task) => task.title));
      const managedTestTasks = ownerTasks.docs.filter((docItem) => {
        const data = docItem.data();
        const title = String(data['title'] ?? '');
        return knownTestTitles.has(title);
      });
      const existingTitles = new Set(
        managedTestTasks
          .map((docItem) => String(docItem.data()['title'] ?? ''))
          .filter(Boolean)
      );

      const isCompleteForToday =
        managedTestTasks.length === this.testTasks.length &&
        managedTestTasks.every((docItem) => this.getDayKeyFromUnknown(docItem.data()['createDate']) === todayKey) &&
        this.testTasks.every((task) => existingTitles.has(task.title));

      if (isCompleteForToday) {
        return;
      }

      await Promise.all(managedTestTasks.map((docItem) => deleteDoc(docItem.ref)));

      const createTaskJobs = this.testTasks.map((taskTemplate, index) =>
        addDoc(tasksCollection, {
          createDate: new Date().toISOString(),
          ownerId: user.uid,
          completed: taskTemplate.status === 'done',
          dueDate: this.getIsoDateWithOffset(taskTemplate.dueOffsetDays),
          status: taskTemplate.status,
          positionIndex: index,
          category: taskTemplate.category,
          title: taskTemplate.title,
          description: taskTemplate.description,
          assignTo: [],
          priority: taskTemplate.priority,
          subTasks: taskTemplate.subTasks
        })
      );

      await Promise.all(createTaskJobs);
    } catch (error) {
      console.error('Error ensuring daily test tasks:', error);
      throw error;
    }
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

      const testEmails = this.testContacts.map((contact) => contact.email.toLowerCase());
      const testTitles = this.testTasks.map((task) => task.title);

      const [matchingContacts, matchingTasks] = await Promise.all([
        getDocs(query(contactsCollection, where('email', 'in', testEmails))),
        getDocs(query(tasksCollection, where('title', 'in', testTitles)))
      ]);

      const deleteJobs: Array<Promise<void>> = [];

      matchingContacts.docs.forEach((docItem) => {
        const ownerId = String(docItem.data()['ownerId'] ?? '');
        if (ownerId && ownerId !== currentOwnerId) {
          deleteJobs.push(deleteDoc(docItem.ref));
        }
      });

      matchingTasks.docs.forEach((docItem) => {
        const ownerId = String(docItem.data()['ownerId'] ?? '');
        if (ownerId && ownerId !== currentOwnerId) {
          deleteJobs.push(deleteDoc(docItem.ref));
        }
      });

      if (deleteJobs.length > 0) {
        await Promise.all(deleteJobs);
      }
    });
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
    let parsedDate: Date | null = null;

    if (value instanceof Date) {
      parsedDate = value;
    } else if (typeof value === 'string') {
      const candidate = new Date(value);
      if (!Number.isNaN(candidate.getTime())) {
        parsedDate = candidate;
      }
    } else if (value && typeof value === 'object' && 'toDate' in (value as Record<string, unknown>)) {
      const timestampLike = value as { toDate?: () => Date };
      if (typeof timestampLike.toDate === 'function') {
        const candidate = timestampLike.toDate();
        if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
          parsedDate = candidate;
        }
      }
    }

    if (!parsedDate) {
      return null;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
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
