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

  onClose(): void {
    this.closeOverlay.emit();
  }

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

  onViewportResize(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.isSmallAssignPlaceholder.set(window.innerWidth < 365);
  }

  getStatus(status: string): string {
    return status
  }

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
    this.currentTask.priority = priority
  }




  getUserForTask(): IContact[] {
    return this.fbService.contactsArray.filter(user =>
      user.name.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.surname.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.email.toLowerCase().includes(this.filterAssignedUsers.toLowerCase())
    )
  }

  isUserAssigned(user: IContact, assignedUsers: IContact[]): boolean {
    if (!assignedUsers || !Array.isArray(assignedUsers)) {
      return false;
    }
    return assignedUsers.some(assignedUser =>
      assignedUser.id === user.id
    );
  }

  toggleUserAssignment(user: IContact, assignedUsers: IContact[]): void {
    if (!assignedUsers) return;

    const index = assignedUsers.findIndex(assignedUser =>
      assignedUser.id === user.id
    );

    if (index > -1) {
      // User ist bereits zugewiesen, entfernen
      assignedUsers.splice(index, 1);
    } else {
      // User ist nicht zugewiesen, hinzufügen
      assignedUsers.push(user);
    }
  }

  toggleAssignDropdown(target: 'task' | 'currentTask'): void {
    this.showAssignDropdown[target] = !this.showAssignDropdown[target];
  }

  toggleCategoryDropdown(target: 'task' | 'currentTask'): void {
    this.showCategoryDropdown[target] = !this.showCategoryDropdown[target];
  }


  dataIsSet() {
    return (this.currentCategory != 'Select task category');
  }

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

  addSubtask(myTask: ITask): void {
    if (!myTask || this.subtask.title.trim() === '') {
      return;
    }
    myTask.subTasks.push({ subtaskTitle: this.subtask.title, subtaskCompleted: false, onEdit: false });
    this.subtask = { title: '', completed: false, onEdit: false };
  }

  editSubtask(subtaskTitle: string, newTitle: string, myTask: ITask): void {
    const subtask = myTask.subTasks.find(st => st.subtaskTitle === subtaskTitle);

    if (subtask) {
      subtask.subtaskTitle = newTitle;
      subtask.onEdit = false;
    }
  }

  deleteSubtask(subtaskTitle: string, myTask: ITask): void {
    myTask.subTasks = myTask.subTasks.filter(st => st.subtaskTitle !== subtaskTitle);
    myTask.subTasks = [...myTask.subTasks];
  }


  allowAddTask(): boolean {
    return this.hasValidTitle();
  }

  allowAddTaskCalendar(): boolean {
    return this.hasValidDueDate();
  }

  // Backward-compatible aliases for existing template bindings.
  alowAddTask(): boolean {
    return this.allowAddTask();
  }

  // Backward-compatible alias for existing template bindings.
  alowAddTaskCalender(): boolean {
    return this.allowAddTaskCalendar();
  }

  canCreateTask(): boolean {
    return this.hasValidTitle() && this.hasValidDueDate() && this.hasValidCategory();
  }

  private hasValidTitle(): boolean {
    return !!this.task.title && this.task.title.trim().length > 0;
  }

  private hasValidCategory(): boolean {
    return this.task.category.category !== -1;
  }

  private hasValidDueDate(): boolean {
    const raw = (this.task.dueDate ?? '').trim();

    if (!raw) {
      return false;
    }

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (!match) {
      return false;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const parsed = new Date(year, month - 1, day);
    const isRealDate = parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;

    if (!isRealDate) {
      return false;
    }

    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return parsed >= todayStart;
  }



  
  openCalendar(target: 'task' | 'currentTask'): void {
    this.calendarTarget = target;
    this.showCalendar = true;
  }

  closeCalendar(): void {
    this.showCalendar = false;
  }

  selectDate(date: Date): void {
    if (date < new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate())) {
      return; // Verhindere Auswahl von Terminen in der Vergangenheit
    }

    // Formatiere Datum korrekt ohne Zeitzonenproblem
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${day}/${month}/${year}`;

    if (this.calendarTarget === 'task') {
      this.task.dueDate = dateString;
    } else {
      this.currentTask.dueDate = dateString;
    }

    this.closeCalendar();
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
    const days: (number | null)[] = [];

    // Füge leere Zellen für die Tage vor dem ersten Tag des Monats hinzu
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Füge die Tage des Monats hinzu
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
  }

  getMonthName(month: number): string {
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return months[month];
  }

  isDayInPast(day: number): boolean {
    const date = new Date(this.currentYear, this.currentMonth, day);
    return date < new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
  }

  onDayClick(day: number): void {
    if (!this.isDayInPast(day)) {
      this.selectDate(new Date(this.currentYear, this.currentMonth, day));
    }
  }



}