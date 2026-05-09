import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ITask } from '../../interfaces/i-task';
import { FbTaskService } from '../../services/fb-task-service';

@Component({
  selector: 'app-info-task',
  imports: [CommonModule],
  templateUrl: './info-task.html',
  styleUrl: './info-task.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoTask {
  task = input.required<ITask>();
  close = output<void>();
  deleted = output<void>();
  edit = output<ITask>();

  private fbTaskService = inject(FbTaskService);

  /**
   * Closes the task details overlay.
   * @returns {void} No return value.
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Deletes the current task and notifies parent listeners.
   * @returns {void} No return value.
   */
  onDelete(): void {
    this.fbTaskService.deleteTask(this.task().dbid);
    this.deleted.emit();
  }

  /**
   * Emits the current task to open edit mode.
   * @returns {void} No return value.
   */
  onEdit(): void {
    this.edit.emit(this.task());
  }

  /**
   * Toggles completion state for a subtask and persists the update.
   * @param {number} index - Index of subtask in the task subtask array.
   * @returns {void} No return value.
   */
  toggleSubtask(index: number): void {
    const t = this.task();
    const subtask = t.subTasks[index];
    subtask.subtaskCompleted = !subtask.subtaskCompleted;
    this.fbTaskService.updateTask(t.dbid, { subTasks: t.subTasks });
  }

  /**
   * Returns the icon path for the current task priority.
   * @returns {string} Asset path for priority icon.
   */
  getPriorityIcon(): string {
    const p = this.task().priority;
    if (p === 'urgent') return 'assets/img/board/board-card/prio-urgent.svg';
    if (p === 'medium') return 'assets/img/board/board-card/prio-medium.svg';
    return 'assets/img/board/board-card/prio-low.svg';
  }

  /**
   * Returns the human-readable label for the current priority value.
   * @returns {string} Priority label.
   */
  getPriorityLabel(): string {
    const p = this.task().priority;
    if (p === 'urgent') return 'Urgent';
    if (p === 'medium') return 'Medium';
    return 'Low';
  }
}
