import { computed, inject, signal } from '@angular/core';
import { FbService } from '../services/fb-service';
import { FbTaskService } from '../services/fb-task-service';
import { ITask } from '../interfaces/i-task';
import { IContact } from '../interfaces/i-contact';

export abstract class TaskFormBase {
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
   * @returns {void} No return value.
   */
  addTask(newTask: ITask): void {
    this.fbTaskService.createTask(newTask);
    this.task.assignTo = [];
    this.task.priority = 'medium';
    this.task.category.category = -1;
    this.task.subTasks = [];
  }


  whichPriority(priority: string): boolean {
    return this.task.priority === priority;
  }


  setPriority(priority: string): void {
    this.task.priority = priority;
    this.currentTask.priority = priority;
  }


  getUserForTask(): IContact[] {
    const normalizedTerm = this.filterAssignedUsers.toLowerCase();
    return this.FbService.contactsArray.filter((user) => this.matchesAssignmentTerm(user, normalizedTerm));
  }


  private matchesAssignmentTerm(user: IContact, normalizedTerm: string): boolean {
    return user.name.toLowerCase().includes(normalizedTerm)
      || user.surname.toLowerCase().includes(normalizedTerm)
      || user.email.toLowerCase().includes(normalizedTerm);
  }


  isUserAssigned(user: IContact, assignedUsers: IContact[]): boolean {
    if (!assignedUsers || !Array.isArray(assignedUsers)) return false;
    return assignedUsers.some((assignedUser) => assignedUser.id === user.id);
  }


  toggleUserAssignment(user: IContact, assignedUsers: IContact[]): void {
    if (!assignedUsers) assignedUsers = [];
    const index = assignedUsers.findIndex((assignedUser) => assignedUser.id === user.id);
    if (index > -1) {
      assignedUsers.splice(index, 1);
      return;
    }
    assignedUsers.push(user);
  }


  toggleAssignDropdown(target: 'task' | 'currentTask'): void {
    this.showAssignDropdown[target] = !this.showAssignDropdown[target];
  }


  toggleCategoryDropdown(target: 'task' | 'currentTask'): void {
    this.showCategoryDropdown[target] = !this.showCategoryDropdown[target];
  }


  dataIsSet(): boolean {
    return this.currentCategory !== 'Select task category';
  }


  closeAssignDropdown(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (!target.closest('.field-assign-to')) this.showAssignDropdown = { task: false, currentTask: false };
    if (!target.closest('.field-category')) this.showCategoryDropdown = { task: false, currentTask: false };
  }


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


  addSubtask(myTask: ITask): void {
    if (!myTask || this.subtask.title.trim() === '') return;
    myTask.subTasks.push({ subtaskTitle: this.subtask.title, subtaskCompleted: false, onEdit: false });
    this.subtask = { title: '', completed: false, onEdit: false };
  }


  editSubtask(subtaskTitle: string, newTitle: string, myTask: ITask): void {
    const subtask = myTask.subTasks.find((st) => st.subtaskTitle === subtaskTitle);
    if (!subtask) return;
    subtask.subtaskTitle = newTitle;
    subtask.onEdit = false;
  }


  deleteSubtask(subtaskTitle: string, myTask: ITask): void {
    myTask.subTasks = myTask.subTasks.filter((st) => st.subtaskTitle !== subtaskTitle);
    myTask.subTasks = [...myTask.subTasks];
  }


  allowAddTask(): boolean {
    return this.hasValidTitle();
  }


  allowAddTaskCalendar(): boolean {
    return this.hasValidDueDate();
  }


  alowAddTask(): boolean {
    return this.allowAddTask();
  }


  alowAddTaskCalender(): boolean {
    return this.allowAddTaskCalendar();
  }


  canCreateTask(): boolean {
    return this.hasValidTitle() && this.hasValidDueDate() && this.hasValidCategory();
  }


  protected hasValidTitle(): boolean {
    return !!this.task.title && this.task.title.trim().length > 0;
  }


  protected hasValidCategory(): boolean {
    return this.task.category.category !== -1;
  }


  protected hasValidDueDate(): boolean {
    const raw = (this.task.dueDate ?? '').trim();
    if (!raw) return false;
    const parsed = this.parseDdMmYyyy(raw);
    if (!parsed) return false;
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return parsed >= todayStart;
  }


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


  openCalendar(target: 'task' | 'currentTask'): void {
    this.calendarTarget = target;
    this.showCalendar = true;
  }


  closeCalendar(): void {
    this.showCalendar = false;
  }


  selectDate(date: Date): void {
    if (this.isDateInPast(date)) return;
    const dateString = this.formatDateDdMmYyyy(date);
    this.applyDateToTarget(dateString);
    this.closeCalendar();
  }


  isDateInPast(date: Date): boolean {
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return date < todayStart;
  }


  private formatDateDdMmYyyy(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
  }


  private applyDateToTarget(dateString: string): void {
    if (this.calendarTarget === 'task') {
      this.task.dueDate = dateString;
      return;
    }
    this.currentTask.dueDate = dateString;
  }


  getDaysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }


  getFirstDayOfMonth(month: number, year: number): number {
    return new Date(year, month, 1).getDay();
  }


  getCalendarDays(): (number | null)[] {
    const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
    const firstDay = this.getFirstDayOfMonth(this.currentMonth, this.currentYear);
    const days = Array.from({ length: firstDay }, () => null as number | null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  }


  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
      return;
    }
    this.currentMonth--;
  }


  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
      return;
    }
    this.currentMonth++;
  }


  getMonthName(month: number): string {
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return months[month];
  }


  isDayInPast(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonth, day);
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return date < todayStart;
  }


  onDayClick(day: number): void {
    if (this.isDayInPast(day)) return;
    this.selectDate(new Date(this.currentYear, this.currentMonth, day));
  }
}
