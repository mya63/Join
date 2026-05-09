import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FbService } from '../services/fb-service';
import { FbTaskService } from '../services/fb-task-service';
import { ITask } from '../interfaces/i-task';
import { IContact } from '../interfaces/i-contact';
import { Router } from '@angular/router';


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
export class AddTask implements OnInit {
  private router = inject(Router);

  /**
   * Validates required fields and creates a new task in the to-do column.
   * @returns {void} No return value.
   */
  create() {
    this.submitAttempted = true;

    if (!this.canCreateTask()) {
      return;
    }

    this.task.status = 'to-do';
    const todoTasks = this.fbTaskService.tasksArray.filter(t => t.status === 'to-do');
    const maxIndex = todoTasks.reduce((max, t) => Math.max(max, t.positionIndex ?? 0), -1);
    this.task.positionIndex = maxIndex + 1;
    this.addTask(this.task);
    this.router.navigate(['/board']);
  }

  /**
   * Resets the add-task form state to its initial defaults.
   * @returns {void} No return value.
   */
  clearForm() {
    this.initTaskState();
  }

  injectedFbService = inject(FbService);
  FbService: FbService = this.injectedFbService;

  injectedfbTaskService = inject(FbTaskService);
  fbTaskService: FbTaskService = this.injectedfbTaskService;

  task: ITask = {} as ITask;
  currentTask: ITask = {} as ITask;
  showAssignDropdown = { task: false, currentTask: false };
  showCategoryDropdown = { task: false, currentTask: false };
  filterAssignedUsers: string = '';
  currentCategory: string = 'Select task category';
  categoryOptions: { category: number, categoryProperties: { name: string; color: string }[] } =
    {
      category: -1,
      categoryProperties: [
        { name: 'User Story', color: '#0038FF' },
        { name: 'Technical Task', color: '#1FD7C1' },
      ]
    };
  subtask: { title: string; completed: boolean; onEdit: boolean } = { title: '', completed: false, onEdit: false };
  showCalendar: boolean = false;
  calendarTarget: 'task' | 'currentTask' = 'task';
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  selectedDate: Date | null = null;
  today: Date = new Date();
  submitAttempted: boolean = false;
  isSmallAssignPlaceholder = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth < 365 : false);
  assignPlaceholder = computed(() => this.isSmallAssignPlaceholder() ? 'contacts' : 'Select contacts to assign');


  /**
   * Initializes responsive state and default task payload.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.submitAttempted = false;
    this.onViewportResize();
    this.initTaskState();
  }

  /**
   * Updates responsive UI flags based on current viewport width.
   * @returns {void} No return value.
   */
  onViewportResize(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.isSmallAssignPlaceholder.set(window.innerWidth < 365);
  }

  /**
   * Rebuilds task-related form models and UI helper flags.
   * @returns {void} No return value.
   */
  private initTaskState(): void {
    this.resetTaskModel();
    this.resetFormUiState();
  }

  /**
   * Resets all task model fields to their default empty values.
   * @returns {void} No return value.
   */
  private resetTaskModel(): void {
    this.task = this.fbTaskService.newTask;
    this.currentTask = this.fbTaskService.newTask;
    this.resetTaskFields();
    this.resetCategoryDefaults();
    this.currentTask = this.task;
  }

  /**
   * Clears core task fields to empty states.
   * @returns {void} No return value.
   */
  private resetTaskFields(): void {
    this.task.status = 'to-do';
    this.task.title = '';
    this.task.description = '';
    this.task.priority = 'medium';
    this.task.assignTo = [];
    this.task.dueDate = '';
    this.task.subTasks = [];
  }

  /**
   * Resets category properties to their default placeholder values.
   * @returns {void} No return value.
   */
  private resetCategoryDefaults(): void {
    this.task.category.categoryProperties[0].color = this.categoryOptions.categoryProperties[0].color;
    this.task.category.categoryProperties[0].name = this.categoryOptions.categoryProperties[0].name;
    this.task.category.category = -1;
  }

  /**
   * Resets all UI state flags and input helpers used by the form.
   * @returns {void} No return value.
   */
  private resetFormUiState(): void {
    this.currentCategory = 'Select task category';
    this.filterAssignedUsers = '';
    this.showAssignDropdown = { task: false, currentTask: false };
    this.showCategoryDropdown = { task: false, currentTask: false };
    this.subtask = { title: '', completed: false, onEdit: false };
    this.showCalendar = false;
  }

  /**
   * Persists a task and resets mutable task fields used by the form.
   * @param {ITask} newTask - Task payload to persist.
   * @returns {void} No return value.
   */
  addTask(newTask: ITask) {
    this.fbTaskService.createTask(newTask);
    this.task.assignTo = [];
    this.task.priority = 'medium';
    this.task.category.category = -1;
    this.task.subTasks = [];
  }

  /**
   * Checks whether the provided priority is currently selected.
   * @param {string} priority - Priority key to compare.
   * @returns {boolean} True when the given priority is active.
   */
  whichPriority(priority: string): boolean {
    return this.task.priority === priority;
  }

  /**
   * Updates the selected priority in both task models.
   * @param {string} priority - Priority key to set.
   * @returns {void} No return value.
   */
  setPriority(priority: string): void {
    this.task.priority = priority;
    this.currentTask.priority = priority
  }




  /**
   * Returns contacts filtered by the current assignee search term.
   * @returns {IContact[]} Filtered contact list for assignment.
   */
  getUserForTask() {
    return this.FbService.contactsArray.filter(user =>
      user.name.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.surname.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.email.toLowerCase().includes(this.filterAssignedUsers.toLowerCase())
    )
  }

  /**
   * Checks whether a user is already part of the assigned user list.
   * @param {IContact} user - User candidate to verify.
   * @param {IContact[]} assignedUsers - Current assigned contacts.
   * @returns {boolean} True when the user is already assigned.
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
   * Adds or removes a user from the assigned contacts collection.
   * @param {IContact} user - User to toggle.
   * @param {IContact[]} assignedUsers - Mutable assigned contacts list.
   * @returns {void} No return value.
   */
  toggleUserAssignment(user: IContact, assignedUsers: IContact[]): void {
    if (!assignedUsers) assignedUsers = [];
    const index = assignedUsers.findIndex(assignedUser => assignedUser.id === user.id);
    if (index > -1) {
      this.removeUserFromAssignment(assignedUsers, index);
    } else {
      this.addUserToAssignment(assignedUsers, user);
    }
  }

  /**
   * Removes a contact from the assigned users list by index.
   * @param {IContact[]} assignedUsers - Mutable assigned contacts array.
   * @param {number} index - Index of the contact to remove.
   * @returns {void} No return value.
   */
  private removeUserFromAssignment(assignedUsers: IContact[], index: number): void {
    assignedUsers.splice(index, 1);
  }

  /**
   * Appends a contact to the assigned users list.
   * @param {IContact[]} assignedUsers - Mutable assigned contacts array.
   * @param {IContact} user - Contact to add.
   * @returns {void} No return value.
   */
  private addUserToAssignment(assignedUsers: IContact[], user: IContact): void {
    assignedUsers.push(user);
  }

  /**
   * Toggles assignee dropdown visibility for the selected model scope.
   * @param {'task' | 'currentTask'} target - Target model scope key.
   * @returns {void} No return value.
   */
  toggleAssignDropdown(target: 'task' | 'currentTask'): void {
    this.showAssignDropdown[target] = !this.showAssignDropdown[target];
  }

  /**
   * Toggles category dropdown visibility for the selected model scope.
   * @param {'task' | 'currentTask'} target - Target model scope key.
   * @returns {void} No return value.
   */
  toggleCategoryDropdown(target: 'task' | 'currentTask'): void {
    this.showCategoryDropdown[target] = !this.showCategoryDropdown[target];
  }


  /**
   * Checks whether a valid category has been selected.
   * @returns {boolean} True when category selection is not the placeholder.
   */
  dataIsSet() {
    return (this.currentCategory != 'Select task category');
  }

  /**
   * Closes assignment and category dropdowns when click happens outside them.
   * @param {Event} event - Global click event.
   * @returns {void} No return value.
   */
  closeAssignDropdown(event: Event) {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const isInsideAssign = !!target.closest('.field-assign-to');
    const isInsideCategory = !!target.closest('.field-category');

    if (!isInsideAssign) {
      this.showAssignDropdown = { task: false, currentTask: false };
    }

    if (!isInsideCategory) {
      this.showCategoryDropdown = { task: false, currentTask: false };
    }
  }

  /**
   * Applies the selected category metadata to the task model.
   * @param {string} categoryName - Display name of the selected category.
   * @returns {void} No return value.
   */
  setCategory(categoryName: string): void {
    this.currentCategory = categoryName;
    const categoryIndex = this.categoryOptions.categoryProperties.findIndex(category => category.name === categoryName);
    if (categoryIndex !== -1) {
      this.task.category.category = 0;
      this.task.category.categoryProperties[0].color = this.categoryOptions.categoryProperties[categoryIndex].color;
      this.task.category.categoryProperties[0].name = this.categoryOptions.categoryProperties[categoryIndex].name;
      this.showCategoryDropdown.currentTask = false;
    }
  }

  /**
   * Appends a new subtask to the provided task.
   * @param {ITask} myTask - Target task that receives the new subtask.
   * @returns {void} No return value.
   */
  addSubtask(myTask: ITask) {
    if (!myTask || this.subtask.title.trim() === '') {
      return;
    }
    myTask.subTasks.push({ subtaskTitle: this.subtask.title, subtaskCompleted: false, onEdit: false });
    this.subtask = { title: '', completed: false, onEdit: false };
  }

  /**
   * Renames an existing subtask and exits edit mode.
   * @param {string} subtaskTitle - Current subtask title.
   * @param {string} newTitle - New subtask title.
   * @param {ITask} myTask - Task containing the subtask.
   * @returns {void} No return value.
   */
  editSubtask(subtaskTitle: string, newTitle: string, myTask: ITask) {
    const subtask = myTask.subTasks.find(st => st.subtaskTitle === subtaskTitle);

    if (subtask) {
      subtask.subtaskTitle = newTitle;
      subtask.onEdit = false;
    }
  }

  /**
   * Removes a subtask from the provided task by title.
   * @param {string} subtaskTitle - Subtask title to remove.
   * @param {ITask} myTask - Task containing the subtask.
   * @returns {void} No return value.
   */
  deleteSubtask(subtaskTitle: string, myTask: ITask) {
    myTask.subTasks = myTask.subTasks.filter(st => st.subtaskTitle !== subtaskTitle);
    myTask.subTasks = [...myTask.subTasks];
  }

  /**
   * Checks whether title validation passes.
   * @returns {boolean} True when task title is valid.
   */
  alowAddTask(): boolean {
    return this.hasValidTitle();
  }

  /**
   * Checks whether due-date validation passes.
   * @returns {boolean} True when due date is valid.
   */
  alowAddTaskCalender(): boolean {
    return this.hasValidDueDate();
  }

  /**
   * Checks whether all required task validations pass.
   * @returns {boolean} True when task can be created.
   */
  canCreateTask(): boolean {
    return this.hasValidTitle() && this.hasValidDueDate() && this.hasValidCategory();
  }

  /**
   * Validates task title input.
   * @returns {boolean} True when title contains non-whitespace content.
   */
  private hasValidTitle(): boolean {
    return !!this.task.title && this.task.title.trim().length > 0;
  }

  /**
   * Validates task category selection.
   * @returns {boolean} True when a non-placeholder category is selected.
   */
  private hasValidCategory(): boolean {
    return this.task.category.category !== -1;
  }

  /**
   * Validates due-date format and ensures date is not in the past.
   * @returns {boolean} True when due date is valid and not expired.
   */
  private hasValidDueDate(): boolean {
    const raw = (this.task.dueDate ?? '').trim();
    if (!raw) return false;

    const parsed = this.parseDdMmYyyy(raw);
    if (!parsed) return false;

    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return parsed >= todayStart;
  }

  /**
   * Parses a date string in dd/mm/yyyy format and returns a Date object.
   * Returns null when the format is invalid or the date does not exist in the calendar.
   * @param {string} raw - Date string to parse.
   * @returns {Date | null} Parsed Date or null when input is invalid.
   */
  private parseDdMmYyyy(raw: string): Date | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const parsed = new Date(year, month - 1, day);
    const isRealDate =
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day;

    return isRealDate ? parsed : null;
  }

  /**
   * Opens the calendar overlay for the selected task model.
   * @param {'task' | 'currentTask'} target - Target model scope for due-date update.
   * @returns {void} No return value.
   */
  openCalendar(target: 'task' | 'currentTask') {
    this.calendarTarget = target;
    this.showCalendar = true;
  }

  /**
   * Closes the calendar overlay.
   * @returns {void} No return value.
   */
  closeCalendar() {
    this.showCalendar = false;
  }

  /**
   * Applies a selected date to the active task model in dd/mm/yyyy format.
   * @param {Date} date - Date picked from the calendar.
   * @returns {void} No return value.
   */
  selectDate(date: Date): void {
    if (this.isDateInPast(date)) return;
    const dateString = this.formatDateDdMmYyyy(date);
    this.applyDateToTarget(dateString);
    this.closeCalendar();
  }

  /**
   * Checks whether the given date lies before today.
   * @param {Date} date - Date to evaluate.
   * @returns {boolean} True when the date is in the past.
   */
  private isDateInPast(date: Date): boolean {
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return date < todayStart;
  }

  /**
   * Formats a Date object as a dd/mm/yyyy string without timezone shifting.
   * @param {Date} date - Date to format.
   * @returns {string} Formatted date string.
   */
  private formatDateDdMmYyyy(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  /**
   * Writes the formatted date string to the currently active task model target.
   * @param {string} dateString - Formatted due date string.
   * @returns {void} No return value.
   */
  private applyDateToTarget(dateString: string): void {
    if (this.calendarTarget === 'task') {
      this.task.dueDate = dateString;
    } else {
      this.currentTask.dueDate = dateString;
    }
  }

  /**
   * Returns the number of days in a given month/year.
   * @param {number} month - Zero-based month index.
   * @param {number} year - Full year value.
   * @returns {number} Number of days in the requested month.
   */
  getDaysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Returns weekday index of the first day in a given month/year.
   * @param {number} month - Zero-based month index.
   * @param {number} year - Full year value.
   * @returns {number} Weekday index (0-6).
   */
  getFirstDayOfMonth(month: number, year: number): number {
    return new Date(year, month, 1).getDay();
  }

  /**
   * Builds a calendar grid including leading empty slots.
   * @returns {(number | null)[]} Calendar day cells for rendering.
   */
  getCalendarDays(): (number | null)[] {
    const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
    const firstDay = this.getFirstDayOfMonth(this.currentMonth, this.currentYear);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  }

  /**
   * Moves calendar view one month backward.
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
   * Moves calendar view one month forward.
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
   * Returns localized month label for calendar header.
   * @param {number} month - Zero-based month index.
   * @returns {string} Month display name.
   */
  getMonthName(month: number): string {
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return months[month];
  }

  /**
   * Checks whether a day in the visible month lies before today.
   * @param {number} day - Day number inside current month view.
   * @returns {boolean} True when the day is in the past.
   */
  isDayInPast(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonth, day);
    return date < new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
  }

  /**
   * Handles day-cell selection and applies date when selectable.
   * @param {number} day - Selected day number.
   * @returns {void} No return value.
   */
  onDayClick(day: number) {
    if (!this.isDayInPast(day)) {
      this.selectDate(new Date(this.currentYear, this.currentMonth, day));
    }
  }



}
