import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnInit, input, output, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
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
export class AddCard extends TaskFormBase implements OnInit, AfterViewInit {
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  @ViewChild('inputContent') inputContent: ElementRef | undefined;
  
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
   * Lifecycle hook after view initialization.
   * @returns {void} No return value.
   */
  ngAfterViewInit(): void {
    // ViewChild is now available
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
   * @returns {Promise<void>} Promise resolved after task is persisted.
   */
  async create(): Promise<void> {
    this.submitAttempted = true;
    if (!this.canCreateTask()) return;
    this.task.positionIndex = this.getNextColumnPositionIndex(this.task.status);
    await this.addTask(this.task);
    this.zone.run(() => {
      this.onClose();
      this.cdr.markForCheck();
    });
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

  /**
   * Scrolls the input content container to the bottom.
   * @returns {void} No return value.
   */
  private scrollToBottom(): void {
    if (this.inputContent) {
      /**
       * Defers scrolling until the next tick so DOM updates are fully applied.
       * @returns {void} No return value.
       */
      setTimeout(() => {
        const element = this.inputContent!.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 0);
    }
  }

  /**
   * Adds a subtask and scrolls to make it visible.
   * @param {ITask} myTask - Task to add subtask to.
   * @returns {void} No return value.
   */
  override addSubtask(myTask: any): void {
    super.addSubtask(myTask);
    this.scrollToBottom();
  }
}
