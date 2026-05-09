import { Injectable, inject, NgZone, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, doc, onSnapshot, query, where } from '@angular/fire/firestore';
import { addDoc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { ITask } from '../interfaces/i-task';
import { FbService } from './fb-service';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class FbTaskService {
  private db = inject(Firestore);
  private fbService = inject(FbService);
  private auth = inject(Auth);
  private ngZone = inject(NgZone);
  private injector = inject(Injector);

  myTasks: VoidFunction | null;
  task: ITask;
  newTask: ITask;
  currentTask: ITask;
  tasksArray: ITask[];
  //collumnsHeaders: string[] = ['to-do', 'in-progress', 'await-feedback', 'done'];
  //collumns: number[][] = [[], [], [], []];

  // Subject to notify components when tasks change
  private tasksUpdatedSubject = new BehaviorSubject<ITask[]>([]);
  readonly tasksUpdated$ = this.tasksUpdatedSubject.asObservable();

  tasksCollection = collection(this.db, 'tasks');

  constructor() {

    this.task = {} as ITask;
    this.currentTask = {} as ITask;
    this.tasksArray = [];
    this.newTask = {
      createDate: new Date().toISOString(),
      ownerId: this.getCurrentUserId(),
      completed: this.task.completed || false,
      dueDate: this.task.dueDate || '',
      status: this.task.status || 'to-do',
      positionIndex: this.task.positionIndex || 0,
      category: this.task.category || { category: -1, categoryProperties: [{ name: 'New Task Category', color: '#000000' }] },
      title: this.task.title || 'New Task Title',
      description: this.task.description || 'New Task Description',
      assignTo: this.task.assignTo || [],
      priority: this.task.priority || 'medium',
      subTasks: this.task.subTasks || [],
    };

    this.myTasks = null;

    // Always bind listener to the UID provided by Firebase auth state.
    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, (user) => {
        const userId = user?.uid || 'guest';
        this.newTask.ownerId = userId;
        this.startTasksListener(userId);
      });
    });
  }

  /**
   * Starts and manages the task snapshot listener for the active user scope.
   * @param {string} userId - Authenticated user identifier or guest fallback id.
   * @returns {void} No return value.
   */
  private startTasksListener(userId: string): void {
    if (this.myTasks) {
      this.myTasks();
    }

    const ownerFilterEnabled = environment.featureFlags?.enableOwnerFilter === true;
    const filteredQuery = userId === 'guest'
      ? query(this.tasksCollection, where('ownerId', '==', 'guest'))
      : query(this.tasksCollection, where('ownerId', 'in', [userId, 'guest']));

    let fallbackActive = false;

    const applySnapshot = (snapshot: any) => {
      this.tasksArray = [];
      snapshot.forEach((element: any) => {
        this.tasksArray.push({ dbid: element.id, ...element.data() } as ITask);
      });
      this.tasksArray = this.tasksArray.sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));
      this.ngZone.run(() => {
        this.tasksUpdatedSubject.next([...this.tasksArray]);
      });
    };

    const attachUnfilteredListener = () => {
      fallbackActive = true;
      if (this.myTasks) {
        this.myTasks();
      }
      this.myTasks = onSnapshot(this.tasksCollection, (snapshot) => {
        applySnapshot(snapshot);
      });
    };

    if (!ownerFilterEnabled) {
      this.myTasks = onSnapshot(this.tasksCollection, (snapshot) => {
        applySnapshot(snapshot);
      });
      return;
    }

    this.myTasks = onSnapshot(filteredQuery, (snapshot) => {
      if (!fallbackActive && snapshot.empty) {
        attachUnfilteredListener();
        return;
      }
      applySnapshot(snapshot);
    }, () => {
      if (!fallbackActive) {
        attachUnfilteredListener();
      }
    });
  }

  /**
   * Creates a task document and ensures a valid owner id is assigned.
   * @param {ITask} task - Task payload to persist.
   * @returns {void} No return value.
   */
  async createTask(task: ITask) {
    let ownerId = this.auth.currentUser?.uid || null;
    if (!ownerId) {
      await new Promise<void>((resolve) => {
        runInInjectionContext(this.injector, () => {
          const unsubscribe = onAuthStateChanged(this.auth, (user) => {
            ownerId = user?.uid || null;
            unsubscribe();
            resolve();
          });
        });
      });
    }

    ownerId = ownerId || this.getCurrentUserId() || 'guest';
    await addDoc(this.tasksCollection, { ...task, ownerId });
  }

  /**
   * Deletes a task document by its Firestore id.
   * @param {string | undefined} taskId - Task document id.
   * @returns {void} No return value.
   */
  async deleteTask(taskId?: string | undefined) {
    if (!taskId) return;
    const taskDoc = doc(this.db, 'tasks', taskId);
    await deleteDoc(taskDoc);
  }

  /**
   * Updates selected task fields and keeps completion state in sync with status.
   * @param {string} taskId - Task document id.
   * @param {Partial<ITask>} updatedData - Partial task fields to update.
   * @returns {void} No return value.
   */
  async updateTask(taskId?: string, updatedData?: Partial<ITask>) {
    if (!taskId || !updatedData) return;
    if (updatedData.status) {
      updatedData.status == 'done' ? updatedData.completed = true : updatedData.completed = false;
    }
    const taskDoc = doc(this.tasksCollection, taskId);
    //console.log('Updating task:', taskId, updatedData);
    await updateDoc(taskDoc, updatedData);
  }

  /**
   * Persists a task position change and optionally updates its column status.
   * @param {ITask} task - Task to reposition.
   * @param {number} newIndex - New zero-based position index.
   * @param {string} status - Optional target status/column.
   * @returns {void} No return value.
   */
  async setNewIndex(task: ITask, newIndex: number, status?: string) {
    const updateData: Partial<ITask> = { positionIndex: newIndex };
    if (status) {
      updateData.status = status;
    }
    await this.updateTask(task.dbid, updateData);
  }

  /**
   * Returns the current user id used for task ownership filtering.
   * @returns {string} Current user id or guest fallback id.
   */
  getCurrentUserId(): string {
    return this.fbService.getCurrentUserId();
  }

  /**
   * Re-normalizes position indices for all tasks in a specific status column.
   * @param {string} status - Target status column key.
   * @returns {void} No return value.
   */
  async fixPositionsInColumn(status: string) {
    const tasksInColumn = this.tasksArray
      .filter(task => task.status === status)
      .sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));

    const updates = tasksInColumn.map((task, index) => {
      if (task.positionIndex !== index) {
        task.positionIndex = index;
        return this.updateTask(task.dbid, { positionIndex: index });
      }
      return Promise.resolve();
    });

    await Promise.all(updates);
  }

  // Behalte die alte Methode für Kompatibilität, aber mache sie optional
  /*   setPositionInCollumn() {
      let n = 0;
      this.collumnsHeaders.forEach(header => {
        this.collumns[n] = [];
        const myArry = this.tasksArray.filter(task => task.status === header).sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0))
        myArry.forEach(element => {
          this.collumns[n].push(element.positionIndex ?? 0);
        });
        n++;
      });
    } */


  /**
   * Disposes the active Firestore task subscription.
   * @returns {void} No return value.
   */
  onDestroy() {
    if (this.myTasks) {
      this.myTasks();
    }
  }

}
