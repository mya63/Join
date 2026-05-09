import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FbService } from '../services/fb-service';
import { FbTaskService } from '../services/fb-task-service';
import { ITask } from '../interfaces/i-task';
import { IContact } from '../interfaces/i-contact';


@Component({
  selector: 'app-tasktest',
  imports: [FormsModule, CommonModule],
  templateUrl: './tasktest.html',
  styleUrl: './tasktest.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tasktest {
  fbService = inject(FbService);
  fbTaskService = inject(FbTaskService);

  task: ITask = {} as ITask;
  currentTask: ITask = {} as ITask;
  defaultPriority: string = 'low';
  priorityOptions: string[] = ['low', 'medium', 'urgent'];
  statusOptions: string[] = ['to-do', 'in-progress', 'await-feedback', 'done'];
  categoryOptions: { category: number, categoryProperties: { name: string; color: string }[] } =
    {
      category: 0,
      categoryProperties: [
        { name: 'User Story', color: '#0038FF' },
        { name: 'Technical Task', color: '#1FD7C1' },
      ]
    };
  columnIndex: number = 0;
  showCalendar: boolean = false;
  calendarTarget: 'task' | 'currentTask' = 'task';
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  selectedDate: Date | null = null;
  today: Date = new Date();
  showAssignDropdown = { task: false, currentTask: false };
  subtask: { title: string; completed: boolean, onEdit: boolean } = { title: '', completed: false, onEdit: false };

  constructor() {
    this.task = this.fbTaskService.newTask;
    if (!this.task.assignTo) {
      this.task.assignTo = [];
    }
    this.columnIndex = 0;
    this.currentTask = this.task;
    if (!this.currentTask.assignTo) {
      this.currentTask.assignTo = [];
    }
    this.fbTaskService.currentTask = this.currentTask;
  }

  /**
   * Returns all tasks sorted by their position index.
   * @returns {ITask[]} Sorted task list.
   */
  gettasks() {
    return this.fbTaskService.tasksArray.sort((a, b) => a.positionIndex - b.positionIndex);
  }

  /**
   * Normalizes task defaults and persists a new task.
   * @param {ITask} newTask - Task payload to create.
   * @returns {void} No return value.
   */
  addTask(newTask: ITask) {
    (newTask.positionIndex < 0 || newTask.positionIndex > 9999 || typeof newTask.positionIndex !== 'number') ? newTask.positionIndex = 0 : null;
    newTask.category.categoryProperties[0].color = this.categoryOptions.categoryProperties[newTask.category.category].color;
    newTask.category.categoryProperties[0].name = this.categoryOptions.categoryProperties[newTask.category.category].name;
    newTask.category.category = 0;
    newTask.createDate = new Date().toISOString();
    this.fbTaskService.createTask(newTask);
    this.task = this.fbTaskService.newTask;
  }

  /**
   * Deletes a task by id.
   * @param {string} taskId - Task document id.
   * @returns {void} No return value.
   */
  async deleteTask(taskId?: string) {
    await this.fbTaskService.deleteTask(taskId);
  }

  /**
   * Persists updates for the currently selected task.
   * @returns {void} No return value.
   */
  async updateTask() {
    await this.fbTaskService.updateTask(this.currentTask.dbid, this.currentTask);
  }


  /**
   * Selects the next task in the local task array.
   * @returns {void} No return value.
   */
  nextTask() {
    if (!this.fbTaskService.tasksArray.length) return;
    this.columnIndex = (this.columnIndex + 1) % this.fbTaskService.tasksArray.length;
    this.currentTask = this.fbTaskService.tasksArray[this.columnIndex];
    this.fbTaskService.currentTask = this.currentTask;
    console.log(this.currentTask, this.columnIndex);

  }

  /**
   * Adds a subtask when a non-empty title is provided.
   * @param {ITask} myTask - Task receiving the new subtask.
   * @returns {void} No return value.
   */
  subtaskEnter(myTask: ITask) {
    if (!myTask || this.subtask.title.trim() === '') {
      return;
    }
    myTask.subTasks.push({ subtaskTitle: this.subtask.title, subtaskCompleted: false, onEdit: false });
    this.subtask = { title: '', completed: false, onEdit: false};
  }

  /**
   * Opens the calendar for the selected task model scope.
   * @param {'task' | 'currentTask'} target - Target model key.
   * @returns {void} No return value.
   */
  openCalendar(target: 'task' | 'currentTask') {
    this.calendarTarget = target;
    this.showCalendar = true;
  }

  /**
   * Closes the calendar popup.
   * @returns {void} No return value.
   */
  closeCalendar() {
    this.showCalendar = false;
  }

  /**
   * Applies a selected due date if it is not in the past.
   * @param {Date} date - Chosen date from the calendar.
   * @returns {void} No return value.
   */
  selectDate(date: Date) {
    if (date < new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate())) {
      return; // Prevent selecting dates in the past.
    }

    // Format date deterministically to avoid timezone shifts.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${day}.${month}.${year}`;

    if (this.calendarTarget === 'task') {
      this.task.dueDate = dateString;
    } else {
      this.currentTask.dueDate = dateString;
    }

    this.closeCalendar();
  }

  /**
   * Returns the number of days for the given month/year.
   * @param {number} month - Zero-based month index.
   * @param {number} year - Full year value.
   * @returns {number} Number of days in the month.
   */
  getDaysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Returns weekday index of the first day in a month.
   * @param {number} month - Zero-based month index.
   * @param {number} year - Full year value.
   * @returns {number} Weekday index (0-6).
   */
  getFirstDayOfMonth(month: number, year: number): number {
    return new Date(year, month, 1).getDay();
  }

  /**
   * Builds calendar cells including leading empty placeholders.
   * @returns {(number | null)[]} Day-cell data for rendering.
   */
  getCalendarDays(): (number | null)[] {
    const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
    const firstDay = this.getFirstDayOfMonth(this.currentMonth, this.currentYear);
    const days: (number | null)[] = [];

    // Add leading empty cells before the first weekday.
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the current month.
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }

  /**
   * Navigates one month backward.
   * @returns {void} No return value.
   */
  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
  }

  /**
   * Navigates one month forward.
   * @returns {void} No return value.
   */
  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
  }

  /**
   * Returns month label for the calendar header.
   * @param {number} month - Zero-based month index.
   * @returns {string} Localized month name.
   */
  getMonthName(month: number): string {
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return months[month];
  }

  /**
   * Checks whether a day in the current view is before today.
   * @param {number} day - Day number in current month.
   * @returns {boolean} True when the date is in the past.
   */
  isDayInPast(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonth, day);
    return date < new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
  }

  /**
   * Handles day selection in the calendar grid.
   * @param {number} day - Selected day number.
   * @returns {void} No return value.
   */
  onDayClick(day: number) {
    if (!this.isDayInPast(day)) {
      this.selectDate(new Date(this.currentYear, this.currentMonth, day));
    }
  }


  /**
   * Returns available contacts for task assignment.
   * @returns {IContact[]} Contact list.
   */
  getUserForTask() {
    return this.fbService.contactsArray;
  }

  /**
   * Checks whether a contact is already assigned to the task.
   * @param {IContact} user - Contact candidate.
   * @param {IContact[]} assignedUsers - Current assigned contacts.
   * @returns {boolean} True when the contact is already assigned.
   */
  isUserAssigned(user: IContact, assignedUsers: IContact[]): boolean {
    if (!assignedUsers || !Array.isArray(assignedUsers)) {
      return false;
    }
    return assignedUsers.some(assignedUser => 
      assignedUser.id === user.id
    );
  }

  /**
   * Toggles assignment membership for a contact.
   * @param {IContact} user - Contact to add or remove.
   * @param {IContact[]} assignedUsers - Mutable assigned contacts array.
   * @returns {void} No return value.
   */
  toggleUserAssignment(user: IContact, assignedUsers: IContact[]): void {
    if (!assignedUsers) {
      assignedUsers = [];
    }
    
    const index = assignedUsers.findIndex(assignedUser => 
      assignedUser.id === user.id 
    );
    
    if (index > -1) {
      // User is already assigned, remove from list.
      assignedUsers.splice(index, 1);
    } else {
      // User is not assigned yet, add to list.
      assignedUsers.push(user);
    }
  }

  /**
   * Toggles assignee dropdown visibility for a target model scope.
   * @param {'task' | 'currentTask'} target - Target model key.
   * @returns {void} No return value.
   */
  toggleAssignDropdown(target: 'task' | 'currentTask'): void {
    this.showAssignDropdown[target] = !this.showAssignDropdown[target];
  }

}



