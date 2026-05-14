// ...existing code...
import { computed, inject, signal } from '@angular/core';
import { FbService } from '../services/fb-service';
import { FbTaskService } from '../services/fb-task-service';
import { ITask } from '../interfaces/i-task';
import { IContact } from '../interfaces/i-contact';

export abstract class TaskFormBase {
  protected _duplicateSubtaskError = false;
  protected readonly injectedFbService = inject(FbService);
  protected readonly injectedFbTaskService = inject(FbTaskService);

  FbService: FbService = this.injectedFbService;
  fbService: FbService = this.injectedFbService;
  fbTaskService: FbTaskService = this.injectedFbTaskService;

  task: ITask = {} as ITask;
  currentTask: ITask = {} as ITask;
  showAssignDropdown = { task: false, currentTask: false };
  showCategoryDropdown = { task: false, currentTask: false };
  filterAssignedUsers = '';
  currentCategory = 'Select task category';
  categoryOptions = {
    category: -1,
    categoryProperties: [
      { name: 'User Story', color: '#0038FF' },
      { name: 'Technical Task', color: '#1FD7C1' },
    ],
  };
  subtask = { title: '', completed: false, onEdit: false };
  showCalendar = false;
  calendarTarget: 'task' | 'currentTask' = 'task';
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  selectedDate: Date | null = null;
  today = new Date();
  submitAttempted = false;
  isSmallAssignPlaceholder = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth < 365 : false);
  assignPlaceholder = computed(() => this.isSmallAssignPlaceholder() ? 'contacts' : 'Select contacts to assign');


  /**
   * Updates responsive placeholder behavior on viewport changes.
   * @returns {void} No return value.
   */
  onViewportResize(): void {
    if (typeof window === 'undefined') return;
    this.isSmallAssignPlaceholder.set(window.innerWidth < 365);
  }


  /**
   * Initializes task models with provided status and default field values.
   * @param {string} status - Initial task status.
   * @returns {void} No return value.
   */
  protected initializeTaskState(status: string): void {
    this.task = this.fbTaskService.newTask;
    this.currentTask = this.fbTaskService.newTask;
    this.resetTaskFields(status);
    this.resetCategoryDefaults();
    this.resetFormUiState();
    this.currentTask = this.task;
  }


  /**
   * Resets mutable core fields in task payload.
   * @param {string} status - Initial task status.
   * @returns {void} No return value.
   */
  protected resetTaskFields(status: string): void {
    this.task.status = status;
    this.task.title = '';
    this.task.description = '';
    this.task.priority = 'medium';
    this.task.assignTo = [];
    this.task.dueDate = '';
    this.task.subTasks = [];
  }


  /**
   * Resets category defaults to placeholder values.
   * @returns {void} No return value.
   */
  protected resetCategoryDefaults(): void {
    this.task.category.categoryProperties[0].color = this.categoryOptions.categoryProperties[0].color;
    this.task.category.categoryProperties[0].name = this.categoryOptions.categoryProperties[0].name;
    this.task.category.category = -1;
  }


  /**
   * Resets UI helper state flags and filters.
   * @returns {void} No return value.
   */
  protected resetFormUiState(): void {
    this.currentCategory = 'Select task category';
    this.filterAssignedUsers = '';
    this.showAssignDropdown = { task: false, currentTask: false };
    this.showCategoryDropdown = { task: false, currentTask: false };
    this.subtask = { title: '', completed: false, onEdit: false };
    this.showCalendar = false;
  }


  /**
   * Persists a task and resets mutable form fields.
   * @param {ITask} newTask - Task payload to persist.
   * @returns {Promise<void>} Promise resolved after save and reset complete.
   */
  async addTask(newTask: ITask): Promise<void> {
    const taskToSave = this.cloneTaskForSaving(newTask);
    await this.fbTaskService.createTask(taskToSave);
    this.resetTaskStateAfterSave();
  }

  /**
   * Creates a safe copy of the task payload before persisting it.
   * @param {ITask} newTask - Task payload to clone.
   * @returns {ITask} Deeply copied task payload.
   */
  private cloneTaskForSaving(newTask: ITask): ITask {
    return {
      ...newTask,
      subTasks: newTask.subTasks && Array.isArray(newTask.subTasks) ? [...newTask.subTasks] : [],
      assignTo: newTask.assignTo && Array.isArray(newTask.assignTo) ? [...newTask.assignTo] : [],
      category: {
        category: newTask.category?.category ?? -1,
        categoryProperties: Array.isArray(newTask.category?.categoryProperties) ? newTask.category.categoryProperties.map((property) => ({ ...property })) : [],
      },
    };
  }

  /**
   * Restores the mutable task model to its default state after saving.
   * @returns {void} No return value.
   */
  private resetTaskStateAfterSave(): void {
    this.task.assignTo = [];
    this.task.priority = 'medium';
    this.task.category.category = -1;
    this.task.subTasks = [];
  }


  /**
   * Checks whether the provided priority matches the currently selected task priority.
   * @param {string} priority - Priority value to compare.
   * @returns {boolean} True when the value is currently selected.
   */
  whichPriority(priority: string): boolean {
    return this.task.priority === priority;
  }


  /**
   * Applies the selected priority to both create and edit task models.
   * @param {string} priority - Priority value to assign.
   * @returns {void} No return value.
   */
  setPriority(priority: string): void {
    this.task.priority = priority;
    this.currentTask.priority = priority;
  }


  /**
   * Returns contacts filtered by the assignment search term.
   * @returns {IContact[]} Contacts matching the current assignment filter.
   */
  getUserForTask(): IContact[] {
    const normalizedTerm = this.filterAssignedUsers.toLowerCase();
    return this.FbService.contactsArray.filter((user) => this.matchesAssignmentTerm(user, normalizedTerm));
  }


  /**
   * Evaluates whether a user matches the assignment search term.
   * @param {IContact} user - Candidate contact.
   * @param {string} normalizedTerm - Lowercased search term.
   * @returns {boolean} True when any searchable field matches.
   */
  private matchesAssignmentTerm(user: IContact, normalizedTerm: string): boolean {
    return user.name.toLowerCase().includes(normalizedTerm)
      || user.surname.toLowerCase().includes(normalizedTerm)
      || user.email.toLowerCase().includes(normalizedTerm);
  }


  /**
   * Checks whether a user is already assigned to the task.
   * @param {IContact} user - Contact to check.
   * @param {IContact[]} assignedUsers - Assigned contacts list.
   * @returns {boolean} True when the user is already assigned.
   */
  isUserAssigned(user: IContact, assignedUsers: IContact[]): boolean {
    if (!assignedUsers || !Array.isArray(assignedUsers)) return false;
    return assignedUsers.some((assignedUser) => assignedUser.id === user.id);
  }


  /**
   * Toggles assignment state for a contact in the provided list.
   * @param {IContact} user - Contact to toggle.
   * @param {IContact[]} assignedUsers - Mutable assigned contacts list.
   * @returns {void} No return value.
   */
  toggleUserAssignment(user: IContact, assignedUsers: IContact[]): void {
    if (!assignedUsers) assignedUsers = [];
    const index = assignedUsers.findIndex((assignedUser) => assignedUser.id === user.id);
    if (index > -1) {
      assignedUsers.splice(index, 1);
      return;
    }
    assignedUsers.push(user);
  }


  /**
   * Toggles the assignment dropdown for create or edit form context.
   * @param {'task' | 'currentTask'} target - Target form model.
   * @returns {void} No return value.
   */
  toggleAssignDropdown(target: 'task' | 'currentTask'): void {
    this.showAssignDropdown[target] = !this.showAssignDropdown[target];
  }


  /**
   * Toggles the category dropdown for create or edit form context.
   * @param {'task' | 'currentTask'} target - Target form model.
   * @returns {void} No return value.
   */
  toggleCategoryDropdown(target: 'task' | 'currentTask'): void {
    this.showCategoryDropdown[target] = !this.showCategoryDropdown[target];
  }


  /**
   * Checks whether a task category has been selected.
   * @returns {boolean} True when a non-placeholder category is active.
   */
  dataIsSet(): boolean {
    return this.currentCategory !== 'Select task category';
  }


  /**
   * Closes assignment and category dropdowns when clicking outside their containers.
   * @param {Event} event - Click event from the document.
   * @returns {void} No return value.
   */
  closeAssignDropdown(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (!target.closest('.field-assign-to')) this.showAssignDropdown = { task: false, currentTask: false };
    if (!target.closest('.field-category')) this.showCategoryDropdown = { task: false, currentTask: false };
  }


  /**
   * Applies a selected category to the task model and closes the edit dropdown.
   * @param {string} categoryName - Selected category label.
   * @returns {void} No return value.
   */
  setCategory(categoryName: string): void {
    this.currentCategory = categoryName;
    const categoryIndex = this.categoryOptions.categoryProperties.findIndex((category) => category.name === categoryName);
    if (categoryIndex === -1) return;
    const category = this.categoryOptions.categoryProperties[categoryIndex];
    this.task.category.category = 0;
    this.task.category.categoryProperties[0].color = category.color;
    this.task.category.categoryProperties[0].name = category.name;
    this.showCategoryDropdown.currentTask = false;
  }


  /**
   * Adds a new subtask to the given task when the input title is valid.
   * @param {ITask} myTask - Task receiving the new subtask.
   * @returns {void} No return value.
   */
  /**
   * Adds a new subtask to the given task when the input title is valid and unique.
   * Sets duplicateSubtaskError to true if a duplicate exists.
   * @param {ITask} myTask - Task receiving the new subtask.
   * @returns {void} No return value.
   */
  addSubtask(myTask: ITask): void {
    this._duplicateSubtaskError = false;
    if (!myTask || this.subtask.title.trim() === '') return;
    const exists = myTask.subTasks.some(st => st.subtaskTitle.trim().toLowerCase() === this.subtask.title.trim().toLowerCase());
    if (exists) {
      this._duplicateSubtaskError = true;
      return;
    }
    myTask.subTasks.push({ subtaskTitle: this.subtask.title, subtaskCompleted: false, onEdit: false });
    this.subtask = { title: '', completed: false, onEdit: false };
  }


  /**
   * Updates a subtask title and exits inline edit mode.
   * @param {string} subtaskTitle - Existing subtask title.
   * @param {string} newTitle - Replacement title.
   * @param {ITask} myTask - Task containing the subtask.
   * @returns {void} No return value.
   */
  editSubtask(subtaskTitle: string, newTitle: string, myTask: ITask): void {
    const subtask = myTask.subTasks.find((st) => st.subtaskTitle === subtaskTitle);
    if (!subtask) return;
    subtask.subtaskTitle = newTitle;
    subtask.onEdit = false;
  }


  /**
   * Enters subtask edit mode and places the caret at the end of the current text.
   * @param {{ onEdit: boolean; subtaskTitle: string }} subtask - Subtask to switch into edit mode.
   * @param {HTMLInputElement} inputElement - Bound input element for the subtask row.
   * @returns {void} No return value.
   */
  startSubtaskEdit(subtask: { onEdit: boolean; subtaskTitle: string }, inputElement: HTMLInputElement): void {
    subtask.onEdit = true;
    setTimeout(() => {
      if (!inputElement) return;
      inputElement.focus();
      const caretIndex = subtask.subtaskTitle.length;
      inputElement.setSelectionRange(caretIndex, caretIndex);
    }, 0);
  }


  /**
   * Removes a subtask from the task by its title.
   * @param {string} subtaskTitle - Subtask title to remove.
   * @param {ITask} myTask - Task containing the subtask.
   * @returns {void} No return value.
   */
  deleteSubtask(subtaskTitle: string, myTask: ITask): void {
    myTask.subTasks = myTask.subTasks.filter((st) => st.subtaskTitle !== subtaskTitle);
    myTask.subTasks = [...myTask.subTasks];
  }


  /**
   * Returns whether the title field currently allows task creation.
   * @returns {boolean} True when title is valid.
   */
  allowAddTask(): boolean {
    return this.hasValidTitle();
  }


  /**
   * Returns whether due-date selection currently allows task creation.
   * @returns {boolean} True when due date is valid.
   */
  allowAddTaskCalendar(): boolean {
    return this.hasValidDueDate();
  }


  /**
   * Legacy alias for allowAddTask.
   * @returns {boolean} True when title is valid.
   */
  alowAddTask(): boolean {
    return this.allowAddTask();
  }


  /**
   * Legacy alias for allowAddTaskCalendar.
   * @returns {boolean} True when due date is valid.
   */
  alowAddTaskCalender(): boolean {
    return this.allowAddTaskCalendar();
  }


  /**
   * Checks whether all required fields are valid for task creation.
   * @returns {boolean} True when title, date, and category are valid.
   */
  canCreateTask(): boolean {
    return this.hasValidTitle() && this.hasValidDueDate() && this.hasValidCategory();
  }


  /**
   * Validates that the task title contains non-whitespace characters.
   * @returns {boolean} True when title is valid.
   */
  protected hasValidTitle(): boolean {
    return !!this.task.title && this.task.title.trim().length > 0;
  }


  /**
   * Validates that a non-default category was selected.
   * @returns {boolean} True when category is valid.
   */
  protected hasValidCategory(): boolean {
    return this.task.category.category !== -1;
  }


  /**
   * Validates due date presence, format, and non-past constraint.
   * @returns {boolean} True when due date is valid.
   */
  protected hasValidDueDate(): boolean {
    const raw = (this.task.dueDate ?? '').trim();
    if (!raw) return false;
    const parsed = this.parseDdMmYyyy(raw);
    if (!parsed) return false;
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return parsed >= todayStart;
  }


  /**
   * Parses dates in dd/mm/yyyy format and rejects invalid calendar values.
   * @param {string} raw - Raw date input.
   * @returns {Date | null} Parsed date or null when invalid.
   */
  protected parseDdMmYyyy(raw: string): Date | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    const isRealDate = parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
    return isRealDate ? parsed : null;
  }


  /**
   * Opens the calendar popover and stores which model should receive the date.
   * @param {'task' | 'currentTask'} target - Target model for date assignment.
   * @returns {void} No return value.
   */
  openCalendar(target: 'task' | 'currentTask'): void {
    this.calendarTarget = target;
    this.showCalendar = true;
  }


  /**
   * Closes the calendar popover.
   * @returns {void} No return value.
   */
  closeCalendar(): void {
    this.showCalendar = false;
  }


  /**
   * Applies a selected date to the active target and closes the calendar.
   * @param {Date} date - Selected date.
   * @returns {void} No return value.
   */
  selectDate(date: Date): void {
    if (this.isDateInPast(date)) return;
    const dateString = this.formatDateDdMmYyyy(date);
    this.applyDateToTarget(dateString);
    this.closeCalendar();
  }


  /**
   * Checks whether a date lies before the current day.
   * @param {Date} date - Date to evaluate.
   * @returns {boolean} True when the date is in the past.
   */
  isDateInPast(date: Date): boolean {
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return date < todayStart;
  }


  /**
   * Formats a Date object to dd/mm/yyyy.
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
   * Applies a formatted date string to the currently active target model.
   * @param {string} dateString - Formatted date value.
   * @returns {void} No return value.
   */
  private applyDateToTarget(dateString: string): void {
    if (this.calendarTarget === 'task') {
      this.task.dueDate = dateString;
      return;
    }
    this.currentTask.dueDate = dateString;
  }


  /**
   * Returns the total number of days in a given month and year.
   * @param {number} month - Zero-based month index.
   * @param {number} year - Full year.
   * @returns {number} Number of days in the month.
   */
  getDaysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }


  /**
   * Returns the weekday index for the first day of a month.
   * @param {number} month - Zero-based month index.
   * @param {number} year - Full year.
   * @returns {number} Weekday index of the month start.
   */
  getFirstDayOfMonth(month: number, year: number): number {
    return new Date(year, month, 1).getDay();
  }


  /**
   * Builds a calendar grid with null placeholders before day 1.
   * @returns {(number | null)[]} Calendar day values with leading placeholders.
   */
  getCalendarDays(): (number | null)[] {
    const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
    const firstDay = this.getFirstDayOfMonth(this.currentMonth, this.currentYear);
    const days = Array.from({ length: firstDay }, () => null as number | null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  }


  /**
   * Navigates the calendar view to the previous month.
   * @returns {void} No return value.
   */
  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
      return;
    }
    this.currentMonth--;
  }


  /**
   * Navigates the calendar view to the next month.
   * @returns {void} No return value.
   */
  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
      return;
    }
    this.currentMonth++;
  }


  /**
   * Returns the localized month name used by the calendar header.
   * @param {number} month - Zero-based month index.
   * @returns {string} Month name.
   */
  getMonthName(month: number): string {
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return months[month];
  }


  /**
   * Checks whether a calendar day in the active month lies in the past.
   * @param {number} day - Day of month.
   * @returns {boolean} True when the day is before today.
   */
  isDayInPast(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonth, day);
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return date < todayStart;
  }


  /**
   * Handles day selection from the calendar grid.
   * @param {number} day - Selected day of month.
   * @returns {void} No return value.
   */
  onDayClick(day: number): void {
    if (this.isDayInPast(day)) return;
    this.selectDate(new Date(this.currentYear, this.currentMonth, day));
  }
}
