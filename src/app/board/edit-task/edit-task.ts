import { Component, ChangeDetectionStrategy, computed, input, output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FbService } from '../../services/fb-service';
import { FbTaskService } from '../../services/fb-task-service';
import { ITask } from '../../interfaces/i-task';
import { IContact } from '../../interfaces/i-contact';

@Component({
  selector: 'app-edit-task',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-task.html',
  styleUrl: './edit-task.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onViewportResize()'
  }
})
export class EditTask implements OnInit {
  task = input.required<ITask>();
  close = output<void>();
  saved = output<void>();

  private fbService = inject(FbService);
  private fbTaskService = inject(FbTaskService);

  editedTask: ITask = {} as ITask;
  showAssignDropdown = false;
  showCategoryDropdown = false;
  filterAssignedUsers = '';
  currentCategory = 'Select task category';
  showCalendar = false;
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  today = new Date();
  subtaskInput = '';
  submitAttempted = false;
  isSmallAssignPlaceholder = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth < 365 : false);
  assignPlaceholder = computed(() => this.isSmallAssignPlaceholder() ? 'contacts' : 'Select contacts to assign');

  categoryOptions = [
    { name: 'User Story', color: '#0038FF' },
    { name: 'Technical Task', color: '#1FD7C1' },
  ];

  /**
   * Initializes editable task copy and view-related state.
   * @returns {void} No return value.
   */
  ngOnInit(): void {
    this.onViewportResize();
    this.buildEditedTaskCopy();
    this.restoreCurrentCategory();
  }

  /**
   * Creates a deep copy of the input task to avoid mutating the original signal value.
   * @returns {void} No return value.
   */
  private buildEditedTaskCopy(): void {
    const t = this.task();
    this.editedTask = {
      ...t,
      assignTo: t.assignTo ? [...t.assignTo] : [],
      subTasks: t.subTasks ? t.subTasks.map(s => ({ ...s })) : [],
      category: this.buildCategoryCopy(t.category),
    };
  }

  /**
   * Creates an immutable copy of task category data.
   * @param {ITask['category']} category - Source category object.
   * @returns {ITask['category']} Deep-copied category object.
   */
  private buildCategoryCopy(category: ITask['category']): ITask['category'] {
    return {
      category: category.category,
      categoryProperties: category.categoryProperties.map((property) => ({ ...property })),
    };
  }

  /**
   * Restores the category label from the edited task's category properties.
   * @returns {void} No return value.
   */
  private restoreCurrentCategory(): void {
    if (this.editedTask.category.category !== -1) {
      this.currentCategory = this.editedTask.category.categoryProperties[0]?.name ?? 'Select task category';
    }
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
   * Closes the edit-task overlay.
   * @returns {void} No return value.
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Validates and persists task edits, then emits a saved event.
   * @returns {Promise<void>} Promise resolved after save flow completes.
   */
  async onSave(): Promise<void> {
    this.submitAttempted = true;
    if (!this.canSave()) return;
    await this.fbTaskService.updateTask(this.editedTask.dbid!, {
      title: this.editedTask.title,
      description: this.editedTask.description,
      dueDate: this.editedTask.dueDate,
      priority: this.editedTask.priority,
      assignTo: this.editedTask.assignTo,
      category: this.editedTask.category,
      subTasks: this.editedTask.subTasks,
    });
    this.saved.emit();
  }

  /**
   * Determines whether all required fields are valid for saving.
   * @returns {boolean} True when title, due date, and category are valid.
   */
  canSave(): boolean {
    return this.hasValidTitle() && this.hasValidDueDate() && this.hasValidCategory();
  }

  /**
   * Checks whether the edited title contains non-whitespace content.
   * @returns {boolean} True when title validation passes.
   */
  hasValidTitle(): boolean {
    return !!this.editedTask.title && this.editedTask.title.trim().length > 0;
  }

  /**
   * Checks whether a non-placeholder category is selected.
   * @returns {boolean} True when category validation passes.
   */
  hasValidCategory(): boolean {
    return this.editedTask.category.category !== -1;
  }

  /**
   * Validates due-date format and ensures it is not in the past.
   * @returns {boolean} True when due date is syntactically and semantically valid.
   */
  hasValidDueDate(): boolean {
    const raw = (this.editedTask.dueDate ?? '').trim();
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
   * Returns context-specific validation hint for the save action.
   * @returns {string} Human-readable validation hint.
   */
  getSaveErrorHint(): string {
    if (!this.hasValidTitle()) return '*Title is required';
    if (!this.hasValidDueDate()) return '*Date must be today or later (dd/mm/yyyy)';
    if (!this.hasValidCategory()) return '*Category is required';
    return '*Please check required fields';
  }

  /**
   * Checks whether a given priority is currently selected.
   * @param {string} priority - Priority key to compare.
   * @returns {boolean} True when the priority matches.
   */
  whichPriority(priority: string): boolean {
    return this.editedTask.priority === priority;
  }

  /**
   * Applies selected priority to the edited task model.
   * @param {string} priority - Priority key to apply.
   * @returns {void} No return value.
   */
  setPriority(priority: string): void {
    this.editedTask.priority = priority;
  }

  /**
   * Returns contacts filtered by assignment search query.
   * @returns {IContact[]} Filtered contact list.
   */
  getUserForTask(): IContact[] {
    return this.fbService.contactsArray.filter(user =>
      user.name.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.surname.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.email.toLowerCase().includes(this.filterAssignedUsers.toLowerCase())
    );
  }

  /**
   * Checks whether a contact is assigned to the edited task.
   * @param {IContact} user - Contact candidate.
   * @returns {boolean} True when the contact is assigned.
   */
  isUserAssigned(user: IContact): boolean {
    return this.editedTask.assignTo.some(u => u.id === user.id);
  }

  /**
   * Adds or removes a contact from the edited task assignee list.
   * @param {IContact} user - Contact to toggle.
   * @returns {void} No return value.
   */
  toggleUserAssignment(user: IContact): void {
    const idx = this.editedTask.assignTo.findIndex(u => u.id === user.id);
    if (idx > -1) {
      this.editedTask.assignTo = this.editedTask.assignTo.filter(u => u.id !== user.id);
    } else {
      this.editedTask.assignTo = [...this.editedTask.assignTo, user];
    }
  }

  /**
   * Toggles assignee dropdown visibility.
   * @returns {void} No return value.
   */
  toggleAssignDropdown(): void {
    this.showAssignDropdown = !this.showAssignDropdown;
  }

  /**
   * Toggles category dropdown visibility.
   * @returns {void} No return value.
   */
  toggleCategoryDropdown(): void {
    this.showCategoryDropdown = !this.showCategoryDropdown;
  }

  /**
   * Applies selected category metadata to the edited task model.
   * @param {string} categoryName - Selected category display name.
   * @returns {void} No return value.
   */
  setCategory(categoryName: string): void {
    this.currentCategory = categoryName;
    const cat = this.categoryOptions.find(c => c.name === categoryName);
    if (cat) {
      this.editedTask.category.category = 0;
      this.editedTask.category.categoryProperties[0] = { name: cat.name, color: cat.color };
      this.showCategoryDropdown = false;
    }
  }

  /**
   * Checks whether a non-placeholder category is currently selected.
   * @returns {boolean} True when category data is set.
   */
  dataIsSet(): boolean {
    return this.currentCategory !== 'Select task category';
  }

  /**
   * Closes dropdowns when click occurs outside their containers.
   * @param {Event} event - Global click event.
   * @returns {void} No return value.
   */
  closeDropdowns(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const isInsideAssign = !!target.closest('.assign-dropdown-wrap, .assign-list');
    const isInsideCategory = !!target.closest('.category-wrap, .category-list');

    if (!isInsideAssign) {
      this.showAssignDropdown = false;
    }

    if (!isInsideCategory) {
      this.showCategoryDropdown = false;
    }
  }

  /**
   * Adds a new subtask from the current subtask input field.
   * @returns {void} No return value.
   */
  addSubtask(): void {
    if (!this.subtaskInput.trim()) return;
    this.editedTask.subTasks.push({ subtaskTitle: this.subtaskInput.trim(), subtaskCompleted: false, onEdit: false });
    this.subtaskInput = '';
  }

  /**
   * Renames an existing subtask and exits edit mode.
   * @param {string} oldTitle - Current subtask title.
   * @param {string} newTitle - New subtask title.
   * @returns {void} No return value.
   */
  editSubtask(oldTitle: string, newTitle: string): void {
    const st = this.editedTask.subTasks.find(s => s.subtaskTitle === oldTitle);
    if (!st) return;

    st.subtaskTitle = newTitle;
    st.onEdit = false;
  }

  /**
   * Deletes a subtask by title.
   * @param {string} title - Subtask title to remove.
   * @returns {void} No return value.
   */
  deleteSubtask(title: string): void {
    this.editedTask.subTasks = this.editedTask.subTasks.filter(s => s.subtaskTitle !== title);
  }

  openCalendar(): void { this.showCalendar = true; }


  closeCalendar(): void { this.showCalendar = false; }


  getMonthName(month: number): string {
    return new Date(2000, month, 1).toLocaleString('default', { month: 'long' });
  }


  previousMonth(): void {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else { this.currentMonth--; }
  }


  nextMonth(): void {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else { this.currentMonth++; }
  }


  getCalendarDays(): (number | null)[] {
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }


  isDayInPast(day: number): boolean {
    const d = new Date(this.currentYear, this.currentMonth, day);
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return d < todayStart;
  }


  onDayClick(day: number): void {
    const d = new Date(this.currentYear, this.currentMonth, day);
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    if (d < todayStart) return;
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    this.editedTask.dueDate = `${dd}/${mm}/${yyyy}`;
    this.closeCalendar();
  }
}
