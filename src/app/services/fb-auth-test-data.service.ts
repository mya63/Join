import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { User } from '@angular/fire/auth';
import { Firestore, addDoc, collection, deleteDoc, getDocs, query, where } from '@angular/fire/firestore';
import { TEST_CONTACTS, TEST_TASKS, TestContactTemplate, TestTaskTemplate } from './fb-auth-test-data.constants';

@Injectable({
  providedIn: 'root',
})
export class FbAuthTestDataService {
  private readonly db = inject(Firestore);
  private readonly injector = inject(Injector);

  /**
   * Synchronizes managed daily test contacts and tasks for the given user.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after sync completes.
   */
  async ensureDailyTestData(user: User): Promise<void> {
    await this.cleanupTestDataForOtherOwners(user.uid);
    await this.ensureDailyTestContacts(user);
    await this.ensureDailyTestTasks(user);
  }

  /**
   * Ensures managed daily test contacts exist and are up to date for the owner.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after contact synchronization.
   */
  private async ensureDailyTestContacts(user: User): Promise<void> {
    const contactsCollection = this.getCollectionInContext('contacts');
    const managedDocs = await this.loadManagedTestContactDocs(contactsCollection, user.uid);
    if (managedDocs.length === 0 || !this.isDailyTestContactsComplete(managedDocs)) {
      await this.recreateManagedTestContacts(contactsCollection, managedDocs, user.uid);
    }
  }

  /**
   * Ensures managed daily test tasks exist and are up to date for the owner.
   * @param {User} user - Authenticated Firebase user.
   * @returns {Promise<void>} Promise resolved after task synchronization.
   */
  private async ensureDailyTestTasks(user: User): Promise<void> {
    const tasksCollection = this.getCollectionInContext('tasks');
    const managedDocs = await this.loadManagedTestTaskDocs(tasksCollection, user.uid);
    if (managedDocs.length === 0 || !this.isDailyTestTasksComplete(managedDocs)) {
      await this.recreateManagedTestTasks(tasksCollection, managedDocs, user.uid);
    }
  }

  private async loadManagedTestContactDocs(
    contactsCollection: ReturnType<typeof collection>,
    ownerId: string
  ): Promise<Awaited<ReturnType<typeof getDocs>>['docs']> {
    const ownerQuery = this.buildQueryInContext(contactsCollection, 'ownerId', '==', ownerId);
    const ownerContacts = await this.getDocsInContext(ownerQuery);
    return ownerContacts.docs.filter((docItem) => this.isManagedTestContactDoc(this.toRecord(docItem.data())));
  }

  /**
   * Checks whether a contact document belongs to managed test fixtures.
   * @param {Record<string, unknown>} data - Contact document payload.
   * @returns {boolean} True when the contact matches known fixture addresses.
   */
  private isManagedTestContactDoc(data: Record<string, unknown>): boolean {
    const email = String(data['email'] ?? '').toLowerCase();
    return this.isKnownOrLegacyTestEmail(email);
  }

  /**
   * Checks known and legacy email variants used by managed test contacts.
   * @param {string} email - Lowercased email value.
   * @returns {boolean} True when the email belongs to fixture contacts.
   */
  private isKnownOrLegacyTestEmail(email: string): boolean {
    const knownEmails = new Set(TEST_CONTACTS.map((contact) => contact.email.toLowerCase()));
    const legacyEmails = new Set(TEST_CONTACTS.map((contact) => contact.email.toLowerCase().replace('@join.local', '@test.join.local')));
    return knownEmails.has(email) || legacyEmails.has(email);
  }

  /**
   * Verifies whether all managed test contacts for today are present and normalized.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} docs - Existing managed contact documents.
   * @returns {boolean} True when the fixture set is complete and current.
   */
  private isDailyTestContactsComplete(docs: Awaited<ReturnType<typeof getDocs>>['docs']): boolean {
    const todayKey = this.getTodayKey();
    const existingRecords = docs.map((docItem) => this.toRecord(docItem.data()));
    const existingEmails = new Set(existingRecords.map((record) => String(record['email'] ?? '').toLowerCase()).filter(Boolean));
    const existingByEmail = new Map(existingRecords.map((record) => [String(record['email'] ?? '').toLowerCase(), record]));
    const hasTodayDates = docs.every((docItem) => this.getDayKeyFromUnknown(this.toRecord(docItem.data())['date']) === todayKey);
    const hasAllEmails = TEST_CONTACTS.every((contact) => existingEmails.has(contact.email.toLowerCase()));
    const hasNormalizedPhones = TEST_CONTACTS.every((contact) => {
      const record = existingByEmail.get(contact.email.toLowerCase());
      if (!record) return false;
      return this.normalizePhone(String(record['phone'] ?? '')) === contact.phone;
    });
    return docs.length === TEST_CONTACTS.length && hasTodayDates && hasAllEmails && hasNormalizedPhones;
  }

  private async recreateManagedTestContacts(
    contactsCollection: ReturnType<typeof collection>,
    managedDocs: Awaited<ReturnType<typeof getDocs>>['docs'],
    ownerId: string
  ): Promise<void> {
    await Promise.all(managedDocs.map((docItem) => this.deleteDocInContext(docItem.ref)));
    const createJobs = TEST_CONTACTS.map((contact) => this.addDocInContext(contactsCollection, this.buildTestContactPayload(contact, ownerId)));
    await Promise.all(createJobs);
  }

  /**
   * Builds the Firestore payload for one managed test contact.
   * @param {TestContactTemplate} contact - Test contact template.
   * @param {string} ownerId - Owner id assigned to the fixture.
   * @returns {Record<string, unknown>} Firestore-ready contact payload.
   */
  private buildTestContactPayload(contact: TestContactTemplate, ownerId: string): Record<string, unknown> {
    return {
      ownerId,
      uid: ownerId,
      date: new Date(),
      color: contact.color,
      name: contact.name,
      surname: contact.surname,
      email: contact.email,
      phone: this.normalizePhone(contact.phone),
    };
  }

  /**
   * Normalizes phone values for stable fixture comparisons.
   * @param {string} phone - Raw phone value.
   * @returns {string} Normalized phone value.
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').trim();
  }

  private async loadManagedTestTaskDocs(
    tasksCollection: ReturnType<typeof collection>,
    ownerId: string
  ): Promise<Awaited<ReturnType<typeof getDocs>>['docs']> {
    const ownerQuery = this.buildQueryInContext(tasksCollection, 'ownerId', '==', ownerId);
    const ownerTasks = await this.getDocsInContext(ownerQuery);
    const knownTitles = new Set(TEST_TASKS.map((task) => task.title));
    return ownerTasks.docs.filter((docItem) => knownTitles.has(String(this.toRecord(docItem.data())['title'] ?? '')));
  }

  /**
   * Verifies whether all managed test tasks for today are present.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} docs - Existing managed task documents.
   * @returns {boolean} True when the fixture set is complete and current.
   */
  private isDailyTestTasksComplete(docs: Awaited<ReturnType<typeof getDocs>>['docs']): boolean {
    const todayKey = this.getTodayKey();
    const existingTitles = new Set(docs.map((docItem) => String(this.toRecord(docItem.data())['title'] ?? '')).filter(Boolean));
    const hasTodayDates = docs.every((docItem) => this.getDayKeyFromUnknown(this.toRecord(docItem.data())['createDate']) === todayKey);
    const hasAllTitles = TEST_TASKS.every((task) => existingTitles.has(task.title));
    return docs.length === TEST_TASKS.length && hasTodayDates && hasAllTitles;
  }

  private async recreateManagedTestTasks(
    tasksCollection: ReturnType<typeof collection>,
    managedDocs: Awaited<ReturnType<typeof getDocs>>['docs'],
    ownerId: string
  ): Promise<void> {
    await Promise.all(managedDocs.map((docItem) => this.deleteDocInContext(docItem.ref)));
    const createJobs = TEST_TASKS.map((taskTemplate, index) => this.addDocInContext(tasksCollection, this.buildTestTaskPayload(taskTemplate, ownerId, index)));
    await Promise.all(createJobs);
  }

  /**
   * Builds the managed test-task payload before persisting it.
   * @param {TestTaskTemplate} taskTemplate - Template data for the test task.
   * @param {string} ownerId - Owner id to assign to the record.
   * @param {number} index - Position index used for ordering.
   * @returns {Record<string, unknown>} Firestore-ready payload object.
   */
  private buildTestTaskPayload(taskTemplate: TestTaskTemplate, ownerId: string, index: number): Record<string, unknown> {
    return {
      createDate: new Date().toISOString(),
      ownerId,
      completed: taskTemplate.status === 'done',
      dueDate: this.getDdMmYyyyWithOffset(taskTemplate.dueOffsetDays),
      status: taskTemplate.status,
      positionIndex: index,
      category: taskTemplate.category,
      title: taskTemplate.title,
      description: taskTemplate.description,
      assignTo: [], priority: taskTemplate.priority, subTasks: taskTemplate.subTasks,
    };
  }

  /**
   * Removes managed test fixtures owned by other users.
   * @param {string} currentOwnerId - Current authenticated owner id.
   * @returns {Promise<void>} Promise resolved after cleanup completes.
   */
  private async cleanupTestDataForOtherOwners(currentOwnerId: string): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const contactsCollection = this.getCollectionInContext('contacts');
      const tasksCollection = this.getCollectionInContext('tasks');
      const [matchingContacts, matchingTasks] = await this.loadMatchingTestFixtures(contactsCollection, tasksCollection);
      const deleteJobs = this.collectForeignFixtureDeleteJobs(matchingContacts.docs, matchingTasks.docs, currentOwnerId);
      if (deleteJobs.length > 0) await Promise.all(deleteJobs);
    });
  }

  /**
   * Loads managed fixture contacts and tasks that match known template identifiers.
   * @param {ReturnType<typeof collection>} contactsCollection - Contacts collection reference.
   * @param {ReturnType<typeof collection>} tasksCollection - Tasks collection reference.
   * @returns {Promise<[Awaited<ReturnType<typeof getDocs>>, Awaited<ReturnType<typeof getDocs>>]>} Matching fixture snapshots.
   */
  private loadMatchingTestFixtures(
    contactsCollection: ReturnType<typeof collection>,
    tasksCollection: ReturnType<typeof collection>
  ): Promise<[Awaited<ReturnType<typeof getDocs>>, Awaited<ReturnType<typeof getDocs>>]> {
    const testEmails = TEST_CONTACTS.map((contact) => contact.email.toLowerCase());
    const testTitles = TEST_TASKS.map((task) => task.title);
    const contactQuery = this.buildQueryInContext(contactsCollection, 'email', 'in', testEmails);
    const taskQuery = this.buildQueryInContext(tasksCollection, 'title', 'in', testTitles);
    return Promise.all([
      this.getDocsInContext(contactQuery),
      this.getDocsInContext(taskQuery),
    ]);
  }

  /**
   * Creates a Firestore collection reference in Angular injection context.
   * @param {'contacts' | 'tasks'} name - Collection name.
   * @returns {ReturnType<typeof collection>} Firestore collection reference.
   */
  private getCollectionInContext(name: 'contacts' | 'tasks'): ReturnType<typeof collection> {
    return runInInjectionContext(this.injector, () => collection(this.db, name));
  }

  /**
   * Creates a Firestore query in Angular injection context.
   * @param {ReturnType<typeof collection>} coll - Collection reference.
   * @param {string} field - Field name to filter.
   * @param {'==' | 'in'} op - Firestore where operator.
   * @param {unknown} value - Filter value.
   * @returns {ReturnType<typeof query>} Firestore query reference.
   */
  private buildQueryInContext(
    coll: ReturnType<typeof collection>,
    field: string,
    op: '==' | 'in',
    value: unknown
  ): ReturnType<typeof query> {
    /**
     * Executes Firestore query construction within Angular injection context.
     * @returns {ReturnType<typeof query>} Firestore query reference.
     */
    return runInInjectionContext(this.injector, () => query(coll, where(field, op, value as never)));
  }

  /**
   * Reads Firestore documents inside Angular injection context.
   * @param {Parameters<typeof getDocs>[0]} docsQuery - Firestore query to execute.
   * @returns {Promise<Awaited<ReturnType<typeof getDocs>>>} Resolved query snapshot.
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
   * Collects delete operations for matching fixture documents from both collections.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} contactDocs - Matching contact fixture documents.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} taskDocs - Matching task fixture documents.
   * @param {string} currentOwnerId - Current authenticated owner id.
   * @returns {Array<Promise<void>>} Delete operations for foreign-owner fixtures.
   */
  private collectForeignFixtureDeleteJobs(
    contactDocs: Awaited<ReturnType<typeof getDocs>>['docs'],
    taskDocs: Awaited<ReturnType<typeof getDocs>>['docs'],
    currentOwnerId: string
  ): Array<Promise<void>> {
    return [
      ...this.collectForeignOwnerDeletes(contactDocs, currentOwnerId),
      ...this.collectForeignOwnerDeletes(taskDocs, currentOwnerId),
    ];
  }

  /**
   * Collects delete operations for fixture records that belong to other owners.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} docs - Candidate fixture documents.
   * @param {string} currentOwnerId - Current authenticated owner id.
   * @returns {Array<Promise<void>>} Delete operations for foreign-owner fixtures.
   */
  private collectForeignOwnerDeletes(
    docs: Awaited<ReturnType<typeof getDocs>>['docs'],
    currentOwnerId: string
  ): Array<Promise<void>> {
    return docs
      .filter((docItem) => this.isForeignOwner(this.toRecord(docItem.data()), currentOwnerId))
      .map((docItem) => this.deleteDocInContext(docItem.ref));
  }

  /**
   * Creates a Firestore document inside Angular injection context.
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

  /**
   * Deletes a Firestore document inside Angular injection context.
   * @param {Parameters<typeof deleteDoc>[0]} docRef - Firestore document reference.
   * @returns {Promise<void>} Promise resolved after deletion.
   */
  private deleteDocInContext(
    docRef: Parameters<typeof deleteDoc>[0]
  ): Promise<void> {
    /**
     * Executes deleteDoc within Angular injection context.
     * @returns {Promise<void>} Promise resolved after deletion.
     */
    return runInInjectionContext(this.injector, () => deleteDoc(docRef));
  }

  /**
   * Checks whether a fixture record belongs to another owner.
   * @param {Record<string, unknown>} data - Fixture payload.
   * @param {string} currentOwnerId - Current authenticated owner id.
   * @returns {boolean} True when the fixture should be deleted.
   */
  private isForeignOwner(data: Record<string, unknown>, currentOwnerId: string): boolean {
    const ownerId = String(data['ownerId'] ?? '');
    return !!ownerId && ownerId !== currentOwnerId;
  }

  /**
   * Casts unknown values to records for safe keyed access.
   * @param {unknown} value - Unknown value from Firestore.
   * @returns {Record<string, unknown>} Record representation.
   */
  private toRecord(value: unknown): Record<string, unknown> {
    return (value ?? {}) as Record<string, unknown>;
  }

  /**
   * Returns today's date key in yyyy-mm-dd format.
   * @returns {string} Current day key.
   */
  private getTodayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formats a date offset from today as dd/mm/yyyy.
   * @param {number} dayOffset - Day offset relative to today.
   * @returns {string} Formatted date string.
   */
  private getDdMmYyyyWithOffset(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Converts unknown date-like values into day keys.
   * @param {unknown} value - Raw date-like value.
   * @returns {string | null} Day key or null when parsing fails.
   */
  private getDayKeyFromUnknown(value: unknown): string | null {
    const parsedDate = this.parseUnknownDate(value);
    return parsedDate ? this.toDayKey(parsedDate) : null;
  }

  /**
   * Parses unknown date-like values (Date, string, or timestamp-like object).
   * @param {unknown} value - Raw value to parse.
   * @returns {Date | null} Parsed date or null.
   */
  private parseUnknownDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string') return this.parseDateString(value);
    return this.parseTimestampLike(value);
  }

  /**
   * Parses a string into a valid Date instance.
   * @param {string} value - Date string value.
   * @returns {Date | null} Parsed date or null when invalid.
   */
  private parseDateString(value: string): Date | null {
    const candidate = new Date(value);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  /**
   * Parses Firestore timestamp-like objects exposing a toDate function.
   * @param {unknown} value - Timestamp-like candidate.
   * @returns {Date | null} Parsed date or null when unsupported.
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
   * Converts a Date to yyyy-mm-dd day-key format.
   * @param {Date} date - Date value.
   * @returns {string} Day key string.
   */
  private toDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
