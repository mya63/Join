import { Component, ChangeDetectionStrategy, computed, input, output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FbService } from '../../services/fb-service';
import { FbTaskService } from '../../services/fb-task-service';
import { ITask } from '../../interfaces/i-task';
import { IContact } from '../../interfaces/i-contact';


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
export class AddCard implements OnInit {
  selectedColumn = input<string>('');
  closeOverlay = output<void>();
  private readonly fbService = inject(FbService);
  private readonly fbTaskService = inject(FbTaskService);

  /**
   * Closes the add-card overlay.
   * @returns {void} No return value.
   */
  onClose(): void {
    this.closeOverlay.emit();
  }

  /**
   * Validates input, computes the next column index, and creates the task.
   * @returns {void} No return value.
   */
  create() {
    this.submitAttempted = true;

    if (!this.canCreateTask()) {
      return;
    }

    const columnTasks = this.fbTaskService.tasksArray.filter(t => t.status === this.task.status);
    const maxIndex = columnTasks.reduce((max, t) => Math.max(max, t.positionIndex ?? 0), -1);
    this.task.positionIndex = maxIndex + 1;

    this.addTask(this.task);
    this.onClose();
  }

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
   * Initializes form state and applies defaults for a new task.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.submitAttempted = false;
    this.onViewportResize();
    this.task = this.fbTaskService.newTask;
    this.currentTask = this.fbTaskService.newTask;
    this.task.status = this.getStatus(this.selectedColumn());
    this.task.title = '';
    this.task.description = '';
    this.task.priority = 'medium';
    this.task.assignTo = [];
    this.task.category.categoryProperties[0].color = this.categoryOptions.categoryProperties[0].color;
    this.task.category.categoryProperties[0].name = this.categoryOptions.categoryProperties[0].name;
    this.task.subTasks = [];
  }

  /**
   * Updates responsive placeholder behavior on viewport changes.
   * @returns {void} No return value.
   */
  onViewportResize(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.isSmallAssignPlaceholder.set(window.innerWidth < 365);
  }

  /**
   * Returns the provided status key unchanged.
   * @param {string} status - Status key from selected column input.
   * @returns {string} Normalized status key for task creation.
   */
  getStatus(status: string): string {
    return status
  }

  /**
   * Persists a new task and resets mutable form-specific task fields.
   * @param {ITask} newTask - Task payload to persist.
   * @returns {void} No return value.
   */
  addTask(newTask: ITask): void {
    this.fbTaskService.createTask(newTask);
    this.task.assignTo = [];
    this.task.priority = 'medium';
    this.task.category.category = -1;
    this.task.subTasks = [];
  }

  /**
   * Checks whether a given priority is currently selected.
   * @param {string} priority - Priority key to compare.
   * @returns {boolean} True when the priority matches the current task state.
   */
  whichPriority(priority: string): boolean {
    return this.task.priority === priority;
  }

  /**
   * Applies the selected priority to both task models.
   * @param {string} priority - Priority key to apply.
   * @returns {void} No return value.
   */
  setPriority(priority: string): void {
    this.task.priority = priority;
    this.currentTask.priority = priority
  }




  /**
   * Returns contacts filtered by the current assignment search term.
   * @returns {IContact[]} Filtered contacts for assignment selection.
   */
  getUserForTask(): IContact[] {
    return this.fbService.contactsArray.filter(user =>
      user.name.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.surname.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.email.toLowerCase().includes(this.filterAssignedUsers.toLowerCase())
    )
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
   * Adds or removes a contact from the assigned users collection.
   * @param {IContact} user - Contact to toggle.
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
   * Toggles assignee dropdown visibility for a model scope.
   * @param {'task' | 'currentTask'} target - Target task model scope.
   * @returns {void} No return value.
   */
  toggleAssignDropdown(target: 'task' | 'currentTask'): void {
    this.showAssignDropdown[target] = !this.showAssignDropdown[target];
  }

  /**
   * Toggles category dropdown visibility for a model scope.
   * @param {'task' | 'currentTask'} target - Target task model scope.
   * @returns {void} No return value.
   */
  toggleCategoryDropdown(target: 'task' | 'currentTask'): void {
    this.showCategoryDropdown[target] = !this.showCategoryDropdown[target];
  }


  /**
   * Checks whether a non-placeholder category has been selected.
   * @returns {boolean} True when category selection is valid.
   */
  dataIsSet() {
    return (this.currentCategory != 'Select task category');
  }

  /**
   * Closes assign/category dropdowns when click occurs outside their containers.
   * @param {Event} event - Global click event.
   * @returns {void} No return value.
   */
  closeAssignDropdown(event: Event): void {
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
   * Applies selected category metadata to the current task.
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
   * Adds a new subtask when the title is not empty.
   * @param {ITask} myTask - Task that receives the subtask.
   * @returns {void} No return value.
   */
  addSubtask(myTask: ITask): void {
    if (!myTask || this.subtask.title.trim() === '') {
      return;
    }
    myTask.subTasks.push({ subtaskTitle: this.subtask.title, subtaskCompleted: false, onEdit: false });
    this.subtask = { title: '', completed: false, onEdit: false };
  }

  /**
   * Renames an existing subtask and exits its edit mode.
   * @param {string} subtaskTitle - Current subtask title.
   * @param {string} newTitle - New subtask title.
   * @param {ITask} myTask - Task containing the subtask.
   * @returns {void} No return value.
   */
  editSubtask(subtaskTitle: string, newTitle: string, myTask: ITask): void {
    const subtask = myTask.subTasks.find(st => st.subtaskTitle === subtaskTitle);

    if (subtask) {
      subtask.subtaskTitle = newTitle;
      subtask.onEdit = false;
    }
  }

  /**
   * Deletes a subtask by title from the target task.
   * @param {string} subtaskTitle - Subtask title to remove.
   * @param {ITask} myTask - Task containing the subtask.
   * @returns {void} No return value.
   */
  deleteSubtask(subtaskTitle: string, myTask: ITask): void {
    myTask.subTasks = myTask.subTasks.filter(st => st.subtaskTitle !== subtaskTitle);
    myTask.subTasks = [...myTask.subTasks];
  }


  /**
   * Validates whether title requirements are fulfilled.
   * @returns {boolean} True when title validation passes.
   */
  allowAddTask(): boolean {
    return this.hasValidTitle();
  }

  /**
   * Validates whether due-date requirements are fulfilled.
   * @returns {boolean} True when due-date validation passes.
   */
  allowAddTaskCalendar(): boolean {
    return this.hasValidDueDate();
  }

  // Backward-compatible aliases for existing template bindings.
  /**
   * Backward-compatible alias for title validation.
   * @returns {boolean} True when title validation passes.
   */
  alowAddTask(): boolean {
    return this.allowAddTask();
  }

  // Backward-compatible alias for existing template bindings.
  /**
   * Backward-compatible alias for due-date validation.
   * @returns {boolean} True when due-date validation passes.
   */
  alowAddTaskCalender(): boolean {
    return this.allowAddTaskCalendar();
  }

  /**
   * Determines whether all required task fields are valid for creation.
   * @returns {boolean} True when title, due date, and category are valid.
   */
  canCreateTask(): boolean {
    return this.hasValidTitle() && this.hasValidDueDate() && this.hasValidCategory();
  }

  /**
   * Checks whether title contains non-whitespace content.
   * @returns {boolean} True when title is valid.
   */
  private hasValidTitle(): boolean {
    return !!this.task.title && this.task.title.trim().length > 0;
  }

  /**
   * Checks whether a category has been selected.
   * @returns {boolean} True when category is not the placeholder state.
   */
  private hasValidCategory(): boolean {
    return this.task.category.category !== -1;
  }

  /**
   * Validates due-date format and ensures selected date is not in the past.
   * @returns {boolean} True when due date is syntactically and semantically valid.
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
   * Opens the calendar for the selected model scope.
   * @param {'task' | 'currentTask'} target - Target task model scope.
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
   * Applies a selected due date if it is not in the past.
   * @param {Date} date - Date selected in calendar.
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
   * Returns the number of days in a month/year pair.
   * @param {number} month - Zero-based month index.
   * @param {number} year - Full year value.
   * @returns {number} Number of days in the requested month.
   */
  getDaysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Returns weekday index of the first day in a month/year pair.
   * @param {number} month - Zero-based month index.
   * @param {number} year - Full year value.
   * @returns {number} Weekday index (0-6).
   */
  getFirstDayOfMonth(month: number, year: number): number {
    return new Date(year, month, 1).getDay();
  }

  /**
   * Builds calendar day cells including leading empty placeholders.
   * @returns {(number | null)[]} Calendar cell values for rendering.
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
   * Moves the calendar view one month backward.
   * @returns {void} No return value.
   */
  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
  }

  /**
   * Moves the calendar view one month forward.
   * @returns {void} No return value.
   */
  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
  }

  /**
   * Returns localized month name for calendar header rendering.
   * @param {number} month - Zero-based month index.
   * @returns {string} Month label.
   */
  getMonthName(month: number): string {
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return months[month];
  }

  /**
   * Checks whether a day in the current month view is before today.
   * @param {number} day - Day number in visible month.
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
  onDayClick(day: number): void {
    if (!this.isDayInPast(day)) {
      this.selectDate(new Date(this.currentYear, this.currentMonth, day));
    }
  }



}
