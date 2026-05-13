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
import { CdkDragDrop, CdkDragEnter, CdkDragExit, moveItemInArray, transferArrayItem, CdkDrag, CdkDropList, } from '@angular/cdk/drag-drop';
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
  activeDropListId: string = '';

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
   * Marks the currently hovered drop list while dragging.
   * @param {CdkDragEnter<ITask[]>} event - Enter event emitted by CDK drop list.
   * @returns {void} No return value.
   */
  onDropListEntered(event: CdkDragEnter<ITask[]>): void {
    this.activeDropListId = event.container.id;
    this.cdr.markForCheck();
  }

  /**
   * Clears the hovered drop list when the drag leaves a column.
   * @param {CdkDragExit<ITask[]>} event - Exit event emitted by CDK drop list.
   * @returns {void} No return value.
   */
  onDropListExited(event: CdkDragExit<ITask[]>): void {
    if (this.activeDropListId === event.container.id) {
      this.activeDropListId = '';
      this.cdr.markForCheck();
    }
  }

  /**
   * Checks whether the given drop list is currently active.
   * @param {string} dropListId - Drop list container id.
   * @returns {boolean} True when the drop list is the hovered active target.
   */
  isDropListActive(dropListId: string): boolean {
    return this.activeDropListId === dropListId;
  }

  /**
   * Clears drag state and any active drop list after a drag gesture ends.
   * @returns {void} No return value.
   */
  onDragEnded(): void {
    this.isDragging = false;
    this.activeDropListId = '';
    this.cdr.markForCheck();
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

  /**
   * Handles mobile context-menu task moves and persists all updates.
   * @param {{ task: ITask; status: ITask['status'] }} event - Task and target status.
   * @returns {Promise<void>} Promise resolved after status and position updates complete.
   */
  async onMoveTaskFromMenu(event: { task: ITask; status: ITask['status'] }): Promise<void> {
    if (!event.task.dbid || event.task.status === event.status) return;
    const sourceColumn = this.getColumnArray(event.task.status);
    const targetColumn = this.getColumnArray(event.status);
    this.moveTaskBetweenColumns(event.task, sourceColumn, targetColumn, event.status);
    await this.persistMovedTask(event.task, sourceColumn, targetColumn, event.status);
    this.cdr.markForCheck();
  }

  /**
   * Moves a task left or right inside its current column and persists the new order.
   * @param {{ task: ITask; direction: 'left' | 'right' }} event - Selected task and direction.
   * @returns {Promise<void>} Promise resolved after position updates complete.
   */
  async onMoveTaskInsideColumn(event: { task: ITask; direction: 'left' | 'right' }): Promise<void> {
    if (!event.task.dbid) return;
    const column = this.getColumnArray(event.task.status);
    const sourceIndex = column.findIndex(task => task.dbid === event.task.dbid);
    const targetIndex = event.direction === 'left' ? sourceIndex - 1 : sourceIndex + 1;
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= column.length) return;
    moveItemInArray(column, sourceIndex, targetIndex);
    await this.persistColumnPositions(column);
    this.cdr.markForCheck();
  }

  /**
   * Moves one task locally from its source array to the target array.
   * @param {ITask} task - Task selected from mobile context menu.
   * @param {ITask[]} sourceColumn - Source status array.
   * @param {ITask[]} targetColumn - Destination status array.
   * @param {ITask['status']} targetStatus - Destination status key.
   * @returns {void} No return value.
   */
  private moveTaskBetweenColumns(task: ITask, sourceColumn: ITask[], targetColumn: ITask[], targetStatus: ITask['status']): void {
    const sourceIndex = sourceColumn.findIndex(item => item.dbid === task.dbid);
    if (sourceIndex > -1) sourceColumn.splice(sourceIndex, 1);
    task.status = targetStatus;
    targetColumn.push(task);
  }

  /**
   * Persists status and updated column positions after mobile context-menu move.
   * @param {ITask} task - Task to persist.
   * @param {ITask[]} sourceColumn - Source status array after removal.
   * @param {ITask[]} targetColumn - Target status array after insert.
   * @param {ITask['status']} targetStatus - Destination status key.
   * @returns {Promise<void>} Promise resolved when persistence is complete.
   */
  private async persistMovedTask(task: ITask, sourceColumn: ITask[], targetColumn: ITask[], targetStatus: ITask['status']): Promise<void> {
    const targetIndex = targetColumn.length - 1;
    await this.fbTaskService.updateTask(task.dbid, { status: targetStatus, positionIndex: targetIndex });
    await Promise.all([this.persistColumnPositions(sourceColumn), this.persistColumnPositions(targetColumn)]);
  }
}
