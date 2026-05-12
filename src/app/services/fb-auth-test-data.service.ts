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

  private async ensureDailyTestContacts(user: User): Promise<void> {
    const contactsCollection = collection(this.db, 'contacts');
    const managedDocs = await this.loadManagedTestContactDocs(contactsCollection, user.uid);
    
    // If NO test contacts exist, create them
    if (managedDocs.length === 0) {
      await this.recreateManagedTestContacts(contactsCollection, managedDocs, user.uid);
      return;
    }
    
    // If test contacts exist, check if they're older than 24 hours
    if (this.isDailyTestContactsComplete(managedDocs)) {
      return;
    }
    
    // If older than 24 hours, recreate them
    await this.recreateManagedTestContacts(contactsCollection, managedDocs, user.uid);
  }

  private async ensureDailyTestTasks(user: User): Promise<void> {
    const tasksCollection = collection(this.db, 'tasks');
    const managedDocs = await this.loadManagedTestTaskDocs(tasksCollection, user.uid);
    
    // If NO test tasks exist, create them
    if (managedDocs.length === 0) {
      await this.recreateManagedTestTasks(tasksCollection, managedDocs, user.uid);
      return;
    }
    
    // If test tasks exist, check if they're older than 24 hours
    if (this.isDailyTestTasksComplete(managedDocs)) {
      return;
    }
    
    // If older than 24 hours, recreate them
    await this.recreateManagedTestTasks(tasksCollection, managedDocs, user.uid);
  }

  private async loadManagedTestContactDocs(
    contactsCollection: ReturnType<typeof collection>,
    ownerId: string
  ): Promise<Awaited<ReturnType<typeof getDocs>>['docs']> {
    const ownerContacts = await getDocs(query(contactsCollection, where('ownerId', '==', ownerId)));
    return ownerContacts.docs.filter((docItem) => this.isManagedTestContactDoc(this.toRecord(docItem.data())));
  }

  private isManagedTestContactDoc(data: Record<string, unknown>): boolean {
    const email = String(data['email'] ?? '').toLowerCase();
    return this.isKnownOrLegacyTestEmail(email);
  }

  private isKnownOrLegacyTestEmail(email: string): boolean {
    const knownEmails = new Set(TEST_CONTACTS.map((contact) => contact.email.toLowerCase()));
    const legacyEmails = new Set(TEST_CONTACTS.map((contact) => contact.email.toLowerCase().replace('@join.local', '@test.join.local')));
    return knownEmails.has(email) || legacyEmails.has(email);
  }

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
    await Promise.all(managedDocs.map((docItem) => deleteDoc(docItem.ref)));
    const createJobs = TEST_CONTACTS.map((contact) => addDoc(contactsCollection, this.buildTestContactPayload(contact, ownerId)));
    await Promise.all(createJobs);
  }

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

  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').trim();
  }

  private async loadManagedTestTaskDocs(
    tasksCollection: ReturnType<typeof collection>,
    ownerId: string
  ): Promise<Awaited<ReturnType<typeof getDocs>>['docs']> {
    const ownerTasks = await getDocs(query(tasksCollection, where('ownerId', '==', ownerId)));
    const knownTitles = new Set(TEST_TASKS.map((task) => task.title));
    return ownerTasks.docs.filter((docItem) => knownTitles.has(String(this.toRecord(docItem.data())['title'] ?? '')));
  }

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
    await Promise.all(managedDocs.map((docItem) => deleteDoc(docItem.ref)));
    const createJobs = TEST_TASKS.map((taskTemplate, index) => addDoc(tasksCollection, this.buildTestTaskPayload(taskTemplate, ownerId, index)));
    await Promise.all(createJobs);
  }

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
      assignTo: [],
      priority: taskTemplate.priority,
      subTasks: taskTemplate.subTasks,
    };
  }

  private async cleanupTestDataForOtherOwners(currentOwnerId: string): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const contactsCollection = collection(this.db, 'contacts');
      const tasksCollection = collection(this.db, 'tasks');
      const [matchingContacts, matchingTasks] = await this.loadMatchingTestFixtures(contactsCollection, tasksCollection);
      const deleteJobs = this.collectForeignFixtureDeleteJobs(matchingContacts.docs, matchingTasks.docs, currentOwnerId);
      if (deleteJobs.length > 0) await Promise.all(deleteJobs);
    });
  }

  private loadMatchingTestFixtures(
    contactsCollection: ReturnType<typeof collection>,
    tasksCollection: ReturnType<typeof collection>
  ): Promise<[Awaited<ReturnType<typeof getDocs>>, Awaited<ReturnType<typeof getDocs>>]> {
    const testEmails = TEST_CONTACTS.map((contact) => contact.email.toLowerCase());
    const testTitles = TEST_TASKS.map((task) => task.title);
    return Promise.all([
      getDocs(query(contactsCollection, where('email', 'in', testEmails))),
      getDocs(query(tasksCollection, where('title', 'in', testTitles))),
    ]);
  }

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

  private collectForeignOwnerDeletes(
    docs: Awaited<ReturnType<typeof getDocs>>['docs'],
    currentOwnerId: string
  ): Array<Promise<void>> {
    return docs
      .filter((docItem) => this.isForeignOwner(this.toRecord(docItem.data()), currentOwnerId))
      .map((docItem) => deleteDoc(docItem.ref));
  }

  private isForeignOwner(data: Record<string, unknown>, currentOwnerId: string): boolean {
    const ownerId = String(data['ownerId'] ?? '');
    return !!ownerId && ownerId !== currentOwnerId;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return (value ?? {}) as Record<string, unknown>;
  }

  private getTodayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDdMmYyyyWithOffset(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private getDayKeyFromUnknown(value: unknown): string | null {
    const parsedDate = this.parseUnknownDate(value);
    return parsedDate ? this.toDayKey(parsedDate) : null;
  }

  private parseUnknownDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string') return this.parseDateString(value);
    return this.parseTimestampLike(value);
  }

  private parseDateString(value: string): Date | null {
    const candidate = new Date(value);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  private parseTimestampLike(value: unknown): Date | null {
    if (!value || typeof value !== 'object') return null;
    if (!('toDate' in (value as Record<string, unknown>))) return null;
    const timestampLike = value as { toDate?: () => Date };
    if (typeof timestampLike.toDate !== 'function') return null;
    const candidate = timestampLike.toDate();
    return candidate instanceof Date && !Number.isNaN(candidate.getTime()) ? candidate : null;
  }

  private toDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
