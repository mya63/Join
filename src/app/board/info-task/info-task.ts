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

  onClose(): void {
    this.close.emit();
  }

  onDelete(): void {
    this.fbTaskService.deleteTask(this.task().dbid);
    this.deleted.emit();
  }

  onEdit(): void {
    this.edit.emit(this.task());
  }

  toggleSubtask(index: number): void {
    const t = this.task();
    const subtask = t.subTasks[index];
    subtask.subtaskCompleted = !subtask.subtaskCompleted;
    this.fbTaskService.updateTask(t.dbid, { subTasks: t.subTasks });
  }

  getPriorityIcon(): string {
    const p = this.task().priority;
    if (p === 'urgent') return 'assets/img/board/board-card/prio-urgent.svg';
    if (p === 'medium') return 'assets/img/board/board-card/prio-medium.svg';
    return 'assets/img/board/board-card/prio-low.svg';
  }

  getPriorityLabel(): string {
    const p = this.task().priority;
    if (p === 'urgent') return 'Urgent';
    if (p === 'medium') return 'Medium';
    return 'Low';
  }
}
