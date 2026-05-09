import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskFormBase } from '../../shared/task-form-base';

@Component({
  selector: 'app-add-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-card.html',
  styleUrl: './add-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onViewportResize()'
  }
})
export class AddCard extends TaskFormBase implements OnInit {
  selectedColumn = input<string>('');
  closeOverlay = output<void>();


  /**
   * Initializes form state and applies defaults for a new task.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.submitAttempted = false;
    this.onViewportResize();
    this.initializeTaskState(this.getStatus(this.selectedColumn()));
  }


  /**
   * Closes the add-card overlay.
   * @returns {void} No return value.
   */
  onClose(): void {
    this.closeOverlay.emit();
  }


  /**
   * Validates input, computes next index and creates the task.
   * @returns {void} No return value.
   */
  create(): void {
    this.submitAttempted = true;
    if (!this.canCreateTask()) return;
    this.task.positionIndex = this.getNextColumnPositionIndex(this.task.status);
    this.addTask(this.task);
    this.onClose();
  }


  /**
   * Returns the provided status key unchanged.
    * @param {string} status - Status key from selected column input.
   * @returns {string} Normalized status key for task creation.
   */
  getStatus(status: string): string {
    return status;
  }


  /**
   * Calculates the next available position index in a column.
   * @param {string} status - Column status key.
   * @returns {number} Next position index.
   */
  private getNextColumnPositionIndex(status: string): number {
    const columnTasks = this.fbTaskService.tasksArray.filter((task) => task.status === status);
    const maxIndex = columnTasks.reduce((max, task) => Math.max(max, task.positionIndex ?? 0), -1);
    return maxIndex + 1;
  }
}
