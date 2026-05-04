import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  ngOnInit() {
    this.checkAuthStatus();
    this.subscribeToTasks();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Reads auth state and prepares greeting context.
   */
  private checkAuthStatus(): void {
    onAuthStateChanged(this.auth, async (user) => {
      if (!user) {
        this.isGuest = true;
        this.currentUserName = '';
      } else {
        this.isGuest = false;
        this.currentUserName = await this.loadDisplayName(user.uid, user.displayName, user.email);
      }
    });
  }

  private async loadDisplayName(uid: string, fallbackDisplay: string | null, email: string | null): Promise<string> {
    try {
      const usersRef = collection(this.db, 'users');
      const q = query(usersRef, where('uid', '==', uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const name = data['name'] || '';
        const surname = data['surname'] || '';
        if (name || surname) return `${name} ${surname}`.trim();
      }
    } catch { /* fall through */ }
    return fallbackDisplay || email?.split('@')[0] || 'User';
  }

  /**
   * Subscribes to task updates from the service.
   */
  private subscribeToTasks(): void {
    this.subscription.add(
      this.fbTaskService.tasksUpdated$.subscribe(() => {
        this.calculateMetrics();
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
