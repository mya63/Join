import { Component, ChangeDetectorRef, inject, Injector, runInInjectionContext, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { FbTaskService } from '../services/fb-task-service';
import { FbAuthService } from '../services/fb-auth-service';
import { ITask } from '../interfaces/i-task';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-summary',
  imports: [CommonModule],
  templateUrl: './summary.html',
  styleUrl: './summary.scss'
})
export class Summary implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private db = inject(Firestore);
  private fbTaskService = inject(FbTaskService);
  private fbAuthService = inject(FbAuthService);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);
  private router = inject(Router);

  /**
   * Navigates to the board page.
   * @returns {void} No return value.
   */
  goToBoard() {
    this.router.navigate(['/board']);
  }
  
  currentUserName = '';
  isGuest = false;

  todoCount = 0;
  doneCount = 0;
  urgentCount = 0;
  upcomingDeadline: { date: string } | null = null;

  tasksInBoard = 0;
  tasksInProgress = 0;
  awaitingFeedback = 0;

  private subscription: Subscription = new Subscription();

  /**
   * Initializes auth and task subscriptions for summary metrics.
   * @returns {void} No return value.
   */
  ngOnInit() {
    this.checkAuthStatus();
    this.subscribeToTasks();
  }

  /**
   * Cleans up active subscriptions on component teardown.
   * @returns {void} No return value.
   */
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Reads auth state and prepares greeting context.
   */
  private checkAuthStatus(): void {
    runInInjectionContext(this.injector, () => onAuthStateChanged(this.auth, async (user) => {
      if (!user) {
        this.isGuest = true;
        this.currentUserName = '';
      } else {
        await this.fbAuthService.forceSyncDailyTestDataForCurrentUser();
        this.isGuest = false;
        this.currentUserName = await this.loadDisplayName(user.uid, user.email || '');
      }
      this.cdr.detectChanges();
    }));
  }

  /**
   * Loads the display name for the authenticated user from Firestore contact records.
   * @param {string} uid - Authenticated user id.
   * @param {string} email - Authenticated user email used for exact-match preference.
   * @returns {Promise<string>} Resolved display name or generic fallback.
   */
  private async loadDisplayName(uid: string, email: string): Promise<string> {
    try {
      return await runInInjectionContext(this.injector, async () => {
        const contactsRef = collection(this.db, 'contacts');
        const nameByOwner = await this.resolveNameByField(contactsRef, 'ownerId', uid, email);
        if (nameByOwner) return nameByOwner;

        const nameByUid = await this.resolveNameByField(contactsRef, 'uid', uid, email);
        if (nameByUid) return nameByUid;

        return 'User';
      });
    } catch {
    }
    return 'User';
  }

  /**
   * Queries contacts by a given field and returns the best-matching display name.
   * Priority: exact email match → non-test email → first result.
   * @param {ReturnType<typeof collection>} contactsRef - Firestore contacts collection reference.
   * @param {'ownerId' | 'uid'} field - Firestore field to query by.
   * @param {string} uid - Value to match against the given field.
   * @param {string} email - Authenticated user email for exact-match preference.
   * @returns {Promise<string | null>} Display name string or null when no match found.
   */
  private async resolveNameByField(
    contactsRef: ReturnType<typeof collection>,
    field: 'ownerId' | 'uid',
    uid: string,
    email: string
  ): Promise<string | null> {
    const snapshot = await getDocs(query(contactsRef, where(field, '==', uid)));
    if (snapshot.empty) return null;

    const preferredDoc = this.pickPreferredContactDoc(snapshot.docs, email);
    return this.extractFullName(preferredDoc.data());
  }

  /**
   * Selects the most relevant contact document from a list based on email preference.
   * @param {Awaited<ReturnType<typeof getDocs>>['docs']} docs - Array of Firestore document snapshots.
   * @param {string} email - Authenticated user email for exact-match preference.
   * @returns {Awaited<ReturnType<typeof getDocs>>['docs'][0]} Best matching document snapshot.
   */
  private pickPreferredContactDoc(
    docs: Awaited<ReturnType<typeof getDocs>>['docs'],
    email: string
  ): Awaited<ReturnType<typeof getDocs>>['docs'][0] {
    const normalizedEmail = email.trim().toLowerCase();

    const byEmail = docs.find(d =>
      String((d.data() as Record<string, unknown>)['email'] || '').trim().toLowerCase() === normalizedEmail
    );
    if (byEmail) return byEmail;

    const nonTest = docs.find(d => {
      const e = String((d.data() as Record<string, unknown>)['email'] || '').trim().toLowerCase();
      return !!e && !e.endsWith('@join.local') && !e.endsWith('@test.join.local');
    });
    return nonTest ?? docs[0];
  }

  /**
   * Builds a full name string from a Firestore contact data object.
   * @param {unknown} rawData - Raw Firestore document data.
   * @returns {string | null} Trimmed full name or null when both name and surname are empty.
   */
  private extractFullName(rawData: unknown): string | null {
    const data = rawData as Record<string, unknown>;
    const name = String(data['name'] || '').trim();
    const surname = String(data['surname'] || '').trim();
    const full = `${name} ${surname}`.trim();
    return full || null;
  }

  /**
   * Subscribes to task updates from the service.
   */
  private subscribeToTasks(): void {
    this.subscription.add(
      this.fbTaskService.tasksUpdated$.subscribe(() => {
        this.calculateMetrics();
        this.cdr.detectChanges();
      })
    );
    this.calculateMetrics();
  }

  /**
   * Calculates all summary metrics from current tasks.
   */
  private calculateMetrics(): void {
    const tasks = this.fbTaskService.tasksArray;

    this.todoCount = tasks.filter(t => t.status === 'to-do').length;
    this.doneCount = tasks.filter(t => t.status === 'done').length;
    this.urgentCount = tasks.filter(t => t.priority === 'urgent').length;
    this.tasksInBoard = tasks.length;
    this.tasksInProgress = tasks.filter(t => t.status === 'in-progress').length;
    this.awaitingFeedback = tasks.filter(t => t.status === 'await-feedback').length;

    this.calculateUpcomingDeadline(tasks);
  }

  /**
   * Finds the nearest upcoming deadline among all tasks.
   */
  private calculateUpcomingDeadline(tasks: ITask[]): void {
    const now = new Date();
    const futureDeadlines = tasks
      .map((task) => ({ task, parsedDate: this.parseDueDate(task.dueDate) }))
      .filter((entry) => !!entry.parsedDate && entry.parsedDate >= now)
      .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());

    if (futureDeadlines.length > 0) {
      const deadline = futureDeadlines[0].parsedDate!;
      this.upcomingDeadline = {
        date: this.formatDate(deadline)
      };
    } else {
      this.upcomingDeadline = null;
    }
  }

  private parseDueDate(raw: string): Date | null {
    const value = (raw ?? '').trim();
    if (!value) return null;
    const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!ddmmyyyy) {
      const isoDate = new Date(value);
      return Number.isNaN(isoDate.getTime()) ? null : isoDate;
    }
    const parsed = new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Formats a date as "Month Day, Year".
   */
  private formatDate(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    return formatter.format(date);
  }
}
