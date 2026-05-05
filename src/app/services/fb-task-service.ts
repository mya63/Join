import { Injectable, inject } from '@angular/core';
import { Firestore, collectionData, collection, doc, onSnapshot, orderBy, query, where } from '@angular/fire/firestore';
import { addDoc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { ITask } from '../interfaces/i-task';
import { FbService } from './fb-service';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class FbTaskService {
  private db = inject(Firestore);
  private fbService = inject(FbService);
  private auth = inject(Auth);

  myTasks: (() => void) | null;
  task: ITask;
  newTask: ITask;
  currentTask: ITask;
  tasksArray: ITask[];
  //collumnsHeaders: string[] = ['to-do', 'in-progress', 'await-feedback', 'done'];
  //collumns: number[][] = [[], [], [], []];

  // Subject to notify components when tasks change
  private tasksUpdatedSubject = new BehaviorSubject<ITask[]>([]);
  tasksUpdated$ = this.tasksUpdatedSubject.asObservable();

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
    onAuthStateChanged(this.auth, (user) => {
      const userId = user?.uid || 'guest';
      this.newTask.ownerId = userId;
      this.startTasksListener(userId);
    });
  }

  private startTasksListener(userId: string): void {
    if (this.myTasks) {
      this.myTasks();
    }

    const tasksCollectionFiltered = query(this.tasksCollection, where('ownerId', '==', userId));
    this.myTasks = onSnapshot(tasksCollectionFiltered, (snapshot) => {
      this.tasksArray = [];
      snapshot.forEach((element) => {
        this.tasksArray.push({ dbid: element.id, ...element.data() } as ITask);
      });
      this.tasksArray = this.tasksArray.sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));

      // Notify components that tasks have been updated
      this.tasksUpdatedSubject.next([...this.tasksArray]);
    });
  }

  async createTask(task: ITask) {
    await addDoc(this.tasksCollection, task);
  }

  async deleteTask(taskId?: string | undefined) {
    if (!taskId) return;
    const taskDoc = doc(this.db, 'tasks', taskId);
    await deleteDoc(taskDoc);
  }

  async updateTask(taskId?: string, updatedData?: Partial<ITask>) {
    if (!taskId || !updatedData) return;
    if (updatedData.status) {
      updatedData.status == 'done' ? updatedData.completed = true : updatedData.completed = false;
    }
    const taskDoc = doc(this.tasksCollection, taskId);
    //console.log('Updating task:', taskId, updatedData);
    await updateDoc(taskDoc, updatedData);
  }

  async setNewIndex(task: ITask, newIndex: number, status?: string) {
    const updateData: Partial<ITask> = { positionIndex: newIndex };
    if (status) {
      updateData.status = status;
    }
    await this.updateTask(task.dbid, updateData);
  }

  getCurrentUserId(): string {
    return this.fbService.getCurrentUserId();
  }

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


  onDestroy() {
    if (this.myTasks) {
      this.myTasks();
    }
  }

}