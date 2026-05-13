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
import { BoardColumns, getAdjacentBoardStatus, getBoardColumnArray, getBoardStatusFromContainerId, moveTaskBetweenColumns, persistColumnPositions, persistMovedTask, syncBoardColumns, updateColumnPositionsAfterMove } from './board-utils';
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
  private readonly boardColumns: BoardColumns = {
    'to-do': this.todoTasks,
    'in-progress': this.inProgressTasks,
    'await-feedback': this.awaitFeedbackTasks,
    'done': this.doneTasks
  };
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
        syncBoardColumns(tasks, this.searchTerm, this.boardColumns);
        this.cdr.markForCheck();
      }
    });

    syncBoardColumns(this.fbTaskService.tasksArray, this.searchTerm, this.boardColumns);
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
   * Handles drag-and-drop operations and persists updated ordering/status.
   * @param {CdkDragDrop<ITask[]>} event - Drag-and-drop payload emitted by CDK.
   * @returns {Promise<void>} Promise resolved after all Firestore updates complete.
   */
  async drop(event: CdkDragDrop<ITask[]>): Promise<void> {
    const draggedTask = event.item.data as ITask;
    if (!draggedTask) return;
    this.isDragging = true;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      await persistColumnPositions(event.container.data, (dbid, payload) => this.fbTaskService.updateTask(dbid, payload));
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      await this.fbTaskService.updateTask(draggedTask.dbid, { status: getBoardStatusFromContainerId(event.container.id), positionIndex: event.currentIndex });
      await updateColumnPositionsAfterMove(event.previousContainer.data, event.container.data, (dbid, payload) => this.fbTaskService.updateTask(dbid, payload));
    }
    this.isDragging = false; this.cdr.markForCheck();
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
    syncBoardColumns(this.fbTaskService.tasksArray, this.searchTerm, this.boardColumns);
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
    const sourceColumn = getBoardColumnArray(event.task.status, this.boardColumns);
    const targetColumn = getBoardColumnArray(event.status, this.boardColumns);
    moveTaskBetweenColumns(event.task, sourceColumn, targetColumn, event.status);
    await persistMovedTask(event.task, sourceColumn, targetColumn, event.status, (dbid, payload) => this.fbTaskService.updateTask(dbid, payload));
    this.cdr.markForCheck();
  }

  /**
   * Moves a task left or right inside its current column and persists the new order.
   * @param {{ task: ITask; direction: 'left' | 'right' }} event - Selected task and direction.
   * @returns {Promise<void>} Promise resolved after position updates complete.
   */
  async onMoveTaskInsideColumn(event: { task: ITask; direction: 'left' | 'right' | 'up' | 'down' }): Promise<void> {
    if (!event.task.dbid) return;
    if (event.direction === 'up' || event.direction === 'down') {
      await this.moveTaskBetweenStatuses(event.task, event.direction);
    } else {
      await this.moveTaskWithinColumn(event.task, event.direction);
    }
  }

  /**
   * Moves task to adjacent status column (up/down through columns).
   * @param {ITask} task - Task to move.
   * @param {'up' | 'down'} direction - Direction of status change.
   * @returns {Promise<void>} Promise resolved after move completes.
   */
  private async moveTaskBetweenStatuses(task: ITask, direction: 'up' | 'down'): Promise<void> {
    const newStatus = getAdjacentBoardStatus(task.status, direction);
    if (!newStatus) return;
    const sourceColumn = getBoardColumnArray(task.status, this.boardColumns);
    const targetColumn = getBoardColumnArray(newStatus, this.boardColumns);
    const sourceIndex = sourceColumn.findIndex(t => t.dbid === task.dbid);
    if (sourceIndex < 0 || !targetColumn) return;
    sourceColumn.splice(sourceIndex, 1);
    targetColumn.push(task);
    task.status = newStatus;
    await Promise.all([this.fbTaskService.updateTask(task.dbid, { status: newStatus }), persistColumnPositions(sourceColumn, (dbid, payload) => this.fbTaskService.updateTask(dbid, payload)), persistColumnPositions(targetColumn, (dbid, payload) => this.fbTaskService.updateTask(dbid, payload))]);
    this.cdr.markForCheck();
  }

  /**
   * Moves task left/right within the same column (reorder).
   * @param {ITask} task - Task to reorder.
   * @param {'left' | 'right'} direction - Direction of reordering.
   * @returns {Promise<void>} Promise resolved after reorder completes.
   */
  private async moveTaskWithinColumn(task: ITask, direction: 'left' | 'right'): Promise<void> {
    const column = getBoardColumnArray(task.status, this.boardColumns);
    const sourceIndex = column.findIndex(t => t.dbid === task.dbid);
    const targetIndex = direction === 'left' ? sourceIndex - 1 : sourceIndex + 1;
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= column.length) return;
    moveItemInArray(column, sourceIndex, targetIndex);
    await persistColumnPositions(column, (dbid, payload) => this.fbTaskService.updateTask(dbid, payload));
    this.cdr.markForCheck();
  }
}
