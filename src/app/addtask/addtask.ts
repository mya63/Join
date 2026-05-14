// ...entfernt: fehlerhafte Klassendeklaration und Getter außerhalb der Klasse...
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskFormBase } from '../shared/task-form-base';

@Component({
  selector: 'app-add-task',
  imports: [CommonModule, FormsModule],
  templateUrl: './addtask.html',
  styleUrl: './addtask.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onViewportResize()'
  }
})
export class AddTask extends TaskFormBase implements OnInit {
  public get duplicateSubtaskError(): boolean {
    return this._duplicateSubtaskError;
  }
  private readonly router = inject(Router);


  /**
   * Initializes responsive state and default task payload.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.submitAttempted = false;
    this.onViewportResize();
    this.initializeTaskState('to-do');
  }


  /**
   * Validates required fields and creates a new task in the to-do column.
   * @returns {Promise<void>} Promise resolved after task is persisted.
   */
  async create(): Promise<void> {
    this.submitAttempted = true;
    if (!this.canCreateTask()) return;
    this.task.status = 'to-do';
    this.task.positionIndex = this.getNextTodoPositionIndex();
    await this.addTask(this.task);
    this.router.navigate(['/board']);
  }


  /**
   * Resets the add-task form state to its initial defaults.
   * @returns {void} No return value.
   */
  clearForm(): void {
    this.initializeTaskState('to-do');
  }


  /**
   * Calculates the next available position index for to-do tasks.
   * @returns {number} Next position index.
   */
  private getNextTodoPositionIndex(): number {
    const todoTasks = this.fbTaskService.tasksArray.filter((task) => task.status === 'to-do');
    const maxIndex = todoTasks.reduce((max, task) => Math.max(max, task.positionIndex ?? 0), -1);
    return maxIndex + 1;
  }
}
