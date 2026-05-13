import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { ITask } from '../../interfaces/i-task';  

@Component({
  selector: 'app-board-card',
  imports: [CommonModule, CdkDragHandle],
  templateUrl: './board-card.html',
  styleUrl: './board-card.scss',
  host: {
    '(document:click)': 'onDocumentClick()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardCard {

  @Input() card!: ITask;
  @Input() displayIndex: number = 0;
  @Input() columnLength: number = 0;
  @Input() dragHandleOnly: boolean = true;
  @Output() cardClick = new EventEmitter<ITask>();
  @Output() moveToStatus = new EventEmitter<{ task: ITask; status: ITask['status'] }>();
  @Output() moveInColumn = new EventEmitter<{ task: ITask; direction: 'left' | 'right' | 'up' | 'down' }>();
  showMobileMenu: boolean = false;

  /**
   * Emits the selected task when the board card is clicked.
   * @returns {void} No return value.
   */
  onCardClick(): void {
    this.cardClick.emit(this.card);
  }

  /**
   * Toggles the mobile move context menu for the current card.
   * @param {MouseEvent} event - Click event from menu trigger button.
   * @returns {void} No return value.
   */
  toggleMobileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showMobileMenu = !this.showMobileMenu;
  }

  /**
   * Emits a move request for the current task and closes the context menu.
   * @param {ITask['status']} status - Target status chosen from the menu.
   * @param {MouseEvent} event - Click event from menu option.
   * @returns {void} No return value.
   */
  onMoveToStatus(status: ITask['status'], event: MouseEvent): void {
    event.stopPropagation();
    this.moveToStatus.emit({ task: this.card, status });
    this.showMobileMenu = false;
  }

  /**
   * Emits a request to move the task in the specified direction.
   * @param {'left' | 'right' | 'up' | 'down'} direction - Direction for position change.
   * @param {MouseEvent} event - Click event from menu option.
   * @returns {void} No return value.
   */
  onMoveInColumn(direction: 'left' | 'right' | 'up' | 'down', event: MouseEvent): void {
    event.stopPropagation();
    this.moveInColumn.emit({ task: this.card, direction });
    this.showMobileMenu = false;
  }

  /**
   * Closes the mobile context menu when clicking outside the card controls.
   * @returns {void} No return value.
   */
  onDocumentClick(): void {
    if (!this.showMobileMenu) return;
    this.showMobileMenu = false;
  }

  /**
   * Returns all valid target statuses excluding the task's current status.
   * @returns {Array<ITask['status']>} List of allowed target statuses.
   */
  getMoveTargets(): Array<ITask['status']> {
    const targets: Array<ITask['status']> = ['to-do', 'in-progress', 'await-feedback', 'done'];
    return targets.filter(status => status !== this.card.status);
  }

  /**
   * Maps internal status key to menu label used in mobile context menu.
   * @param {ITask['status']} status - Internal status key.
   * @returns {string} Human-readable label for the status.
   */
  getStatusLabel(status: ITask['status']): string {
    if (status === 'to-do') return 'To-do';
    if (status === 'in-progress') return 'In progress';
    if (status === 'await-feedback') return 'Review';
    return 'Done';
  }

  /**
   * Checks whether current task can move one position left in its column.
   * @returns {boolean} True when task is not at first position.
   */
  canMoveLeft(): boolean {
    return this.displayIndex > 1;
  }

  /**
   * Checks whether current task can move one position right in its column.
   * @returns {boolean} True when task is not at last position.
   */
  canMoveRight(): boolean {
    return this.displayIndex < this.columnLength;
  }

  /**
   * Checks whether current task can move up to the previous status column.
   * @returns {boolean} True when task is not in the first status column (to-do).
   */
  canMoveUp(): boolean {
    return this.card.status !== 'to-do';
  }

  /**
   * Checks whether current task can move down to the next status column.
   * @returns {boolean} True when task is not in the last status column (done).
   */
  canMoveDown(): boolean {
    return this.card.status !== 'done';
  }

  /**
   * Counts completed subtasks for the current task.
   * @returns {number} Number of completed subtasks.
   */
  getSubtaskDone(): number {
    const subTasks = this.card.subTasks ?? [];
    return subTasks.filter(subtask => subtask.subtaskCompleted === true).length;
  }

  /**
   * Calculates subtask completion progress as a percentage value.
   * @returns {number} Progress percentage in range 0-100.
   */
  getSubtaskProgress(): number {
    const subTasks = this.card.subTasks ?? [];
    if (subTasks.length === 0) return 0;
    return (this.getSubtaskDone() / subTasks.length) * 100;
  }

  /**
   * Returns maximum 7 contacts from task's assignTo list.
   * @returns {Array} Array of up to 7 contacts.
   */
  getDisplayContacts(): Array<any> {
    return (this.card.assignTo ?? []).slice(0, 7);
  }

  /**
   * Checks if contact list exceeds 7 items and should show ellipsis.
   * @returns {boolean} True if more than 7 contacts exist.
   */
  hasMoreContacts(): boolean {
    return (this.card.assignTo ?? []).length > 7;
  }
}