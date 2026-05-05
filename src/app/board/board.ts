import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardHeader } from './board-header/board-header';
import { FormsModule } from '@angular/forms';
import { FbTaskService } from '../services/fb-task-service';
import { ITask } from '../interfaces/i-task';
import { BoardCard } from './board-card/board-card';
import { AddCard } from './add-card/add-card';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag, CdkDropList, } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-board',
  imports: [BoardHeader, FormsModule, BoardCard, AddCard, CdkDropList, CdkDrag, CommonModule],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Board implements OnInit, OnDestroy {
  private fbTaskService = inject(FbTaskService);

  task: ITask = {} as ITask;
  currentTask: ITask = {} as ITask;
  defaultPriority: string = 'low';
  priorityOptions: string[] = ['low', 'medium', 'urgent'];
  columnIndex: number = 0;
  collumns: string[] = ['getTaskCollumnOne', 'getTaskCollumnTwo', 'getTaskCollumnThree', 'getTaskCollumnFour'];

  // Cached column arrays to maintain references for CDK
  todoTasks: ITask[] = [];
  inProgressTasks: ITask[] = [];
  awaitFeedbackTasks: ITask[] = [];
  doneTasks: ITask[] = [];

  // Overlay properties
  showAddCardOverlay: boolean = false;
  selectedColumn: string = '';
  
  // Search properties
  searchTerm: string = '';

  private tasksSubscription: Subscription = new Subscription();

  constructor() {
    this.task = this.fbTaskService.newTask;
    this.columnIndex = 0;
    this.currentTask = {} as ITask;
    this.fbTaskService.currentTask = this.currentTask;
  }

  ngOnInit() {
    // Subscribe to task updates from the service only for external changes
    this.tasksSubscription = this.fbTaskService.tasksUpdated$.subscribe(tasks => {
      // Only update if we're not in the middle of a drag operation
      if (!this.isDragging) {
        this.updateColumnArrays();
      }
    });

    // Initial update
    this.updateColumnArrays();
  }

  private isDragging = false;

  ngOnDestroy() {
    this.tasksSubscription.unsubscribe();
  }

  gettasks() {
    return this.fbTaskService.tasksArray.sort((a, b) => a.positionIndex - b.positionIndex);
  }

  getTaskCollumn(header: string) {
    const myArry = this.fbTaskService.tasksArray.filter(task => task.status === header)
    return myArry
  }

  updateColumnArrays() {
    //console.log('Updating column arrays, isDragging:', this.isDragging);
    //console.log('All tasks from service:', this.fbTaskService.tasksArray);

    // Clear existing arrays while maintaining references
    this.todoTasks.length = 0;
    this.inProgressTasks.length = 0;
    this.awaitFeedbackTasks.length = 0;
    this.doneTasks.length = 0;

    // Get filtered tasks based on search term
    const filteredTasks = this.getFilteredTasks();

    // Populate arrays with sorted and filtered tasks
    const todoTasks = filteredTasks
      .filter(task => task.status === 'to-do')
      .sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));
    this.todoTasks.push(...todoTasks);

    const inProgressTasks = filteredTasks
      .filter(task => task.status === 'in-progress')
      .sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));
    this.inProgressTasks.push(...inProgressTasks);

    const awaitFeedbackTasks = filteredTasks
      .filter(task => task.status === 'await-feedback')
      .sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));
    this.awaitFeedbackTasks.push(...awaitFeedbackTasks);

    const doneTasks = filteredTasks
      .filter(task => task.status === 'done')
      .sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));
    this.doneTasks.push(...doneTasks);

    /*     console.log('Updated arrays:', {
          todoTasks: this.todoTasks,
          inProgressTasks: this.inProgressTasks,
          awaitFeedbackTasks: this.awaitFeedbackTasks,
          doneTasks: this.doneTasks
        }); */
  }

  getColumnArray(status: string): ITask[] {
    switch (status) {
      case 'to-do':
        return this.todoTasks;
      case 'in-progress':
        return this.inProgressTasks;
      case 'await-feedback':
        return this.awaitFeedbackTasks;
      case 'done':
        return this.doneTasks;
      default:
        return [];
    }
  }

  getColumnArrayById(containerId: string): ITask[] {
    const status = this.getStatusFromContainerId(containerId);
    return this.getColumnArray(status);
  }

  async drop(event: CdkDragDrop<ITask[]>) {
    const draggedTask = event.item.data as ITask;
    //console.log('Drop event:', event, 'Dragged task:', draggedTask);

    if (!draggedTask) return;

    this.isDragging = true;

    if (event.previousContainer === event.container) {
      // Innerhalb derselben Spalte verschieben
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      //console.log('Moved within same column:', event.container.data);

      // Positionsindizes für alle Tasks in dieser Spalte aktualisieren
      const updates = event.container.data.map((task, index) => {
        task.positionIndex = index;
        return this.fbTaskService.updateTask(task.dbid, { positionIndex: index });
      });

      await Promise.all(updates);
    } else {
      // Zwischen Spalten verschieben
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Status des verschobenen Tasks ändern
      const newStatus = this.getStatusFromContainerId(event.container.id);
      draggedTask.status = newStatus;

      /*       console.log('Moved between columns:', {
              from: event.previousContainer.id,
              to: event.container.id,
              newStatus,
              task: draggedTask
            }); */

      // Task Status und Position in Firebase aktualisieren
      await this.fbTaskService.updateTask(draggedTask.dbid, {
        status: newStatus,
        positionIndex: event.currentIndex
      });

      // Positionsindizes in beiden Spalten korrigieren
      const sourceUpdates = event.previousContainer.data.map((task, index) => {
        task.positionIndex = index;
        return this.fbTaskService.updateTask(task.dbid, { positionIndex: index });
      });

      const targetUpdates = event.container.data.map((task, index) => {
        task.positionIndex = index;
        return this.fbTaskService.updateTask(task.dbid, { positionIndex: index });
      });

      await Promise.all([...sourceUpdates, ...targetUpdates]);
    }

    this.isDragging = false;
  }

  private getStatusFromContainerId(containerId: string): string {
    switch (containerId) {
      case 'getTaskCollumnOne':
        return 'to-do';
      case 'getTaskCollumnTwo':
        return 'in-progress';
      case 'getTaskCollumnThree':
        return 'await-feedback';
      case 'getTaskCollumnFour':
        return 'done';
      default:
        return 'to-do';
    }
  }



  /** Predicate function that only allows even numbers to be dropped into a list. */
  evenPredicate(item: CdkDrag<number>) {
    return true; //item.data % 2 === 0;
  }

  /** Predicate function that doesn't allow items to be dropped into a list. */
  noReturnPredicate() {
    return true;
  }

  newPredicate() {
    return true;
  }

  onDragStarted() {
    this.isDragging = true;
    //console.log('Drag started');
  }

  onDragEnded() {
    //console.log('Drag ended');
    // Don't set isDragging to false here, let the drop method handle it
  }

  // Search methods
  onSearchTasks(searchTerm: string): void {
    this.searchTerm = searchTerm.toLowerCase().trim();
    console.log('Searching for tasks with term:', this.searchTerm);
    this.updateColumnArrays();
  }

  private getFilteredTasks(): ITask[] {
    if (!this.searchTerm) {
      return this.fbTaskService.tasksArray;
    }

    return this.fbTaskService.tasksArray.filter(task => {
      const titleMatch = task.title?.toLowerCase().includes(this.searchTerm) || false;
      const descriptionMatch = task.description?.toLowerCase().includes(this.searchTerm) || false;
      return titleMatch || descriptionMatch;
    });
  }

  // Overlay-Methoden
  openAddCardOverlay(columnType: string): void {
    this.selectedColumn = columnType;
    this.showAddCardOverlay = true;
    console.log('Opening add card overlay for column:', columnType);
  }

  closeAddCardOverlay(): void {
    this.showAddCardOverlay = false;
    this.selectedColumn = '';
  }
}