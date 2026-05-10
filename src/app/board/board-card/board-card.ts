import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { ITask } from '../../interfaces/i-task';  

@Component({
  selector: 'app-board-card',
  imports: [CommonModule, CdkDragHandle],
  templateUrl: './board-card.html',
  styleUrl: './board-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardCard {

  @Input() card!: ITask;
  @Input() displayIndex: number = 0;
  @Input() dragHandleOnly: boolean = true;
  @Output() cardClick = new EventEmitter<ITask>();

  /**
   * Emits the selected task when the board card is clicked.
   * @returns {void} No return value.
   */
  onCardClick(): void {
    this.cardClick.emit(this.card);
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

}