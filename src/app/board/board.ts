import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardHeader } from './board-header/board-header';
import { FormsModule } from '@angular/forms';
import { FbTaskService } from '../services/fb-task-service';
import { ITask } from '../interfaces/i-task';
import { BoardCard } from './board-card/board-card';
import { AddCard } from './add-card/add-card';
import { InfoTask } from './info-task/info-task';
import { EditTask } from './edit-task/edit-task';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag, CdkDropList, } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-board',
  imports: [BoardHeader, FormsModule, BoardCard, AddCard, InfoTask, EditTask, CdkDropList, CdkDrag, CommonModule],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onViewportResize()'
  }
})
export class Board implements OnInit, OnDestroy {
  private fbTaskService = inject(FbTaskService);
  private cdr = inject(ChangeDetectorRef);

  columnIndex: number = 0;
  collumns: string[] = ['getTaskCollumnOne', 'getTaskCollumnTwo', 'getTaskCollumnThree', 'getTaskCollumnFour'];
  todoTasks: ITask[] = [];
  inProgressTasks: ITask[] = [];
  awaitFeedbackTasks: ITask[] = [];
  doneTasks: ITask[] = [];
  showAddCardOverlay: boolean = false;
  selectedColumn: string = '';
  showInfoTask: boolean = false;
  selectedTask: ITask | null = null;
  showEditTask: boolean = false;
  searchTerm: string = '';
  dragHandleOnly: boolean = false;

  private tasksSubscription: Subscription = new Subscription();

  /**
   * Initializes board defaults and resets the shared current-task placeholder.
   * @returns {void} No return value.
   */
  constructor() {
    this.columnIndex = 0;
    this.fbTaskService.currentTask = {} as ITask;
  }

  /**
   * Subscribes to task updates and initializes cached column data.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.tasksSubscription = this.fbTaskService.tasksUpdated$.subscribe(tasks => {
      if (!this.isDragging) {
        this.updateColumnArrays();
        this.cdr.markForCheck();
      }
    });

    this.updateColumnArrays();
    this.onViewportResize();
    this.cdr.markForCheck();
  }

  isDragging = false;

  /**
   * Determines whether drag-and-drop should be disabled for the current viewport.
   * @returns {boolean} True when drag-and-drop interactions are disabled.
   */
  isDragDisabled(): boolean {
    return window.innerWidth <= 1350;
  }

  /**
   * Updates drag mode according to viewport width.
   * @returns {void} No return value.
   */
  onViewportResize(): void {
    if (typeof window === 'undefined') return;
    this.dragHandleOnly = false;
    this.cdr.markForCheck();
  }

  /**
   * Unsubscribes from task stream updates when the component is destroyed.
   * @returns {void} No return value.
   */
  ngOnDestroy(): void {
    this.tasksSubscription.unsubscribe();
  }

  /**
   * Rebuilds cached column arrays from the current filtered task set.
   * @returns {void} No return value.
   */
  updateColumnArrays(): void {
    this.clearColumnArrays();
    const filteredTasks = this.getFilteredTasks();
    this.populateColumnArrays(filteredTasks);
  }

  /**
   * Resets all column arrays to empty while keeping their references intact.
   * @returns {void} No return value.
   */
  private clearColumnArrays(): void {
    this.todoTasks.length = 0;
    this.inProgressTasks.length = 0;
    this.awaitFeedbackTasks.length = 0;
    this.doneTasks.length = 0;
  }

  /**
   * Distributes filtered tasks into the correct column arrays sorted by position.
   * @param {ITask[]} tasks - Pre-filtered task list to distribute.
   * @returns {void} No return value.
   */
  private populateColumnArrays(tasks: ITask[]): void {
    const byStatus = (status: string) =>
      tasks
        .filter(t => t.status === status)
        .sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));

    this.todoTasks.push(...byStatus('to-do'));
    this.inProgressTasks.push(...byStatus('in-progress'));
    this.awaitFeedbackTasks.push(...byStatus('await-feedback'));
    this.doneTasks.push(...byStatus('done'));
  }

  /**
   * Returns the cached task array for a specific status column.
   * @param {string} status - Status key for the target column.
   * @returns {ITask[]} Mutable column array used by the board view.
   */
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

  /**
   * Resolves a drop container id and returns its backing column array.
   * @param {string} containerId - CDK drop-list container id.
   * @returns {ITask[]} Column array associated with the container.
   */
  getColumnArrayById(containerId: string): ITask[] {
    const status = this.getStatusFromContainerId(containerId);
    return this.getColumnArray(status);
  }

  /**
   * Handles drag-and-drop operations and persists updated ordering/status.
   * @param {CdkDragDrop<ITask[]>} event - Drag-and-drop payload emitted by CDK.
   * @returns {Promise<void>} Promise resolved after all Firestore updates complete.
   */
  async drop(event: CdkDragDrop<ITask[]>): Promise<void> {
    const draggedTask = event.item.data as ITask;
    if (!draggedTask) return;
    this.isDragging = true;
    if (event.previousContainer === event.container) {
      await this.handleSameColumnDrop(event);
    } else {
      await this.handleCrossColumnDrop(event, draggedTask);
    }
    this.finalizeDragState();
  }

  /**
   * Reorders tasks within the same column and persists new position indices.
   * @param {CdkDragDrop<ITask[]>} event - Drop event within a single column.
   * @returns {Promise<void>} Promise resolved after position updates complete.
   */
  private async handleSameColumnDrop(event: CdkDragDrop<ITask[]>): Promise<void> {
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    await this.persistColumnPositions(event.container.data);
  }

  /**
   * Moves a task to another column, updates its status, and persists positions in both columns.
   * @param {CdkDragDrop<ITask[]>} event - Drop event across two columns.
   * @param {ITask} draggedTask - The task being moved.
   * @returns {Promise<void>} Promise resolved after all Firestore updates complete.
   */
  private async handleCrossColumnDrop(event: CdkDragDrop<ITask[]>, draggedTask: ITask): Promise<void> {
    this.transferTaskBetweenColumns(event);
    await this.updateDraggedTaskStatus(event, draggedTask);
    await this.updateColumnPositionsAfterMove(event);
  }

  /**
   * Persists the moved task status and index in the new column.
   * @param {CdkDragDrop<ITask[]>} event - Drop event containing target metadata.
   * @param {ITask} draggedTask - Task being moved.
   * @returns {Promise<void>} Promise resolved after status persistence.
   */
  private async updateDraggedTaskStatus(event: CdkDragDrop<ITask[]>, draggedTask: ITask): Promise<void> {
    const newStatus = this.getStatusFromContainerId(event.container.id);
    draggedTask.status = newStatus;
    await this.fbTaskService.updateTask(draggedTask.dbid, { status: newStatus, positionIndex: event.currentIndex });
  }

  /**
   * Resets drag state and triggers change detection after drop handling.
   * @returns {void} No return value.
   */
  private finalizeDragState(): void {
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  /**
   * Transfers a task between container arrays using CDK utilities.
   * @param {CdkDragDrop<ITask[]>} event - Drop event with source and destination containers.
   * @returns {void} No return value.
   */
  private transferTaskBetweenColumns(event: CdkDragDrop<ITask[]>): void {
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
  }

  /**
   * Updates position indices in both source and destination columns after a cross-column move.
   * @param {CdkDragDrop<ITask[]>} event - Drop event with container references.
   * @returns {Promise<void>} Promise resolved after all Firestore position updates complete.
   */
  private async updateColumnPositionsAfterMove(event: CdkDragDrop<ITask[]>): Promise<void> {
    await Promise.all([
      ...this.buildPositionUpdates(event.previousContainer.data),
      ...this.buildPositionUpdates(event.container.data)
    ]);
  }

  /**
   * Assigns sequential position indices to a column array and returns the Firestore update promises.
   * @param {ITask[]} columnData - Ordered task array for a single column.
   * @returns {Promise<void>[]} Array of Firestore update promises.
   */
  private buildPositionUpdates(columnData: ITask[]): Promise<void>[] {
    return columnData.map((task, index) => {
      task.positionIndex = index;
      return this.fbTaskService.updateTask(task.dbid, { positionIndex: index });
    });
  }

  /**
   * Persists position indices for all tasks in a column.
   * @param {ITask[]} columnData - Ordered task array to persist.
   * @returns {Promise<void>} Promise resolved after all updates complete.
   */
  private async persistColumnPositions(columnData: ITask[]): Promise<void> {
    await Promise.all(this.buildPositionUpdates(columnData));
  }

  /**
   * Maps a CDK drop-list container id to the internal task status key.
   * @param {string} containerId - CDK drop-list container id.
   * @returns {string} Status key for the corresponding board column.
   */
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

  /**
   * Placeholder drop predicate that currently allows all drops.
   * @returns {boolean} Always returns true in the current implementation.
   */
  noReturnPredicate(): boolean {
    return true;
  }

  /**
   * Marks the board as actively dragging to prevent conflicting UI refreshes.
   * @returns {void} No return value.
   */
  onDragStarted(): void {
    this.isDragging = true;
  }

  /**
   * Applies a text filter and rebuilds visible task columns.
   * @param {string} searchTerm - Raw search term entered by the user.
   * @returns {void} No return value.
   */
  onSearchTasks(searchTerm: string): void {
    this.searchTerm = searchTerm.toLowerCase().trim();
    this.updateColumnArrays();
  }

  /**
   * Returns tasks filtered by the normalized search term.
   * @returns {ITask[]} Tasks matching title or description criteria.
   */
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

  /**
   * Opens the add-task overlay for a specific target column.
   * @param {string} columnType - Target status/column key.
   * @returns {void} No return value.
   */
  openAddCardOverlay(columnType: string): void {
    this.selectedColumn = columnType;
    this.showAddCardOverlay = true;
  }

  /**
   * Closes the add-task overlay and resets selected column metadata.
   * @returns {void} No return value.
   */
  closeAddCardOverlay(): void {
    this.showAddCardOverlay = false;
    this.selectedColumn = '';
  }

  /**
   * Opens the task detail overlay for the selected task.
   * @param {ITask} task - Task to display in the detail view.
   * @returns {void} No return value.
   */
  openInfoTask(task: ITask): void {
    this.selectedTask = task;
    this.showInfoTask = true;
    this.cdr.markForCheck();
  }

  /**
   * Closes the task detail overlay and clears selection state.
   * @returns {void} No return value.
   */
  closeInfoTask(): void {
    this.showInfoTask = false;
    this.selectedTask = null;
    this.cdr.markForCheck();
  }

  /**
   * Opens the edit overlay for the currently selected task.
   * @returns {void} No return value.
   */
  openEditTask(): void {
    this.showEditTask = true;
    this.cdr.markForCheck();
  }

  /**
   * Closes the edit overlay.
   * @returns {void} No return value.
   */
  closeEditTask(): void {
    this.showEditTask = false;
    this.cdr.markForCheck();
  }

  /**
   * Handles successful task save by closing overlays and clearing task selection.
   * @returns {void} No return value.
   */
  onEditSaved(): void {
    this.showEditTask = false;
    this.showInfoTask = false;
    this.selectedTask = null;
    this.cdr.markForCheck();
  }
}
