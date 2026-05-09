import { Component, ChangeDetectorRef, inject, Injector, runInInjectionContext, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { FbTaskService } from '../services/fb-task-service';
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
        this.isGuest = false;
        this.currentUserName = await this.loadDisplayName(user.uid);
      }
      this.cdr.detectChanges();
    }));
  }

  /**
   * Loads display name for a user via uid/ownerId contact records.
   * @param {string} uid - Authenticated user id.
   * @returns {Promise<string>} Resolved display name or fallback value.
   */
  private async loadDisplayName(uid: string): Promise<string> {
    try {
      return await runInInjectionContext(this.injector, async () => {
        const contactsRef = collection(this.db, 'contacts');
        const contactByUid = query(contactsRef, where('uid', '==', uid));
        const contactByUidSnapshot = await getDocs(contactByUid);
        if (!contactByUidSnapshot.empty) {
          const data = contactByUidSnapshot.docs[0].data();
          const name = data['name'] || '';
          const surname = data['surname'] || '';
          if (name || surname) return `${name} ${surname}`.trim();
        }

        const contactByOwnerId = query(contactsRef, where('ownerId', '==', uid));
        const contactByOwnerIdSnapshot = await getDocs(contactByOwnerId);
        if (!contactByOwnerIdSnapshot.empty) {
          const data = contactByOwnerIdSnapshot.docs[0].data();
          const name = data['name'] || '';
          const surname = data['surname'] || '';
          if (name || surname) return `${name} ${surname}`.trim();
        }

        return 'User';
      });
    } catch {
      // Keep fallback generic if Firestore fetch fails.
    }

    return 'User';
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
      .filter(t => t.dueDate && new Date(t.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (futureDeadlines.length > 0) {
      const deadline = new Date(futureDeadlines[0].dueDate);
      this.upcomingDeadline = {
        date: this.formatDate(deadline)
      };
    } else {
      this.upcomingDeadline = null;
    }
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
