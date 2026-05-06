import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ITask } from '../../interfaces/i-task';  

@Component({
  selector: 'app-board-card',
  imports: [CommonModule],
  templateUrl: './board-card.html',
  styleUrl: './board-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardCard {

  @Input() card!: ITask;
  @Input() displayIndex: number = 0;
  @Output() cardClick = new EventEmitter<ITask>();

  onCardClick(): void {
    this.cardClick.emit(this.card);
  }

  getSubtaskDone(): number {
    return this.card.subTasks.filter(subtask => subtask.subtaskCompleted === true).length;
  }

  getSubtaskProgress(): number {
    if (this.card.subTasks.length === 0) return 0;
    return (this.getSubtaskDone() / this.card.subTasks.length) * 100;
  }

}