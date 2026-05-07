import { Component, ChangeDetectionStrategy, input, output, inject, OnInit } from '@angular/core';
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

  categoryOptions = [
    { name: 'User Story', color: '#0038FF' },
    { name: 'Technical Task', color: '#1FD7C1' },
  ];

  ngOnInit(): void {
    // Deep copy task to avoid mutating original
    const t = this.task();
    this.editedTask = {
      ...t,
      assignTo: t.assignTo ? [...t.assignTo] : [],
      subTasks: t.subTasks ? t.subTasks.map(s => ({ ...s })) : [],
      category: {
        category: t.category.category,
        categoryProperties: t.category.categoryProperties.map(p => ({ ...p })),
      },
    };
    if (this.editedTask.category.category !== -1) {
      this.currentCategory = this.editedTask.category.categoryProperties[0]?.name ?? 'Select task category';
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    this.submitAttempted = true;
    if (!this.canSave()) return;
    this.fbTaskService.updateTask(this.editedTask.dbid!, {
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

  canSave(): boolean {
    return this.hasValidTitle() && this.hasValidDueDate() && this.hasValidCategory();
  }

  hasValidTitle(): boolean {
    return !!this.editedTask.title && this.editedTask.title.trim().length > 0;
  }

  hasValidCategory(): boolean {
    return this.editedTask.category.category !== -1;
  }

  hasValidDueDate(): boolean {
    const raw = (this.editedTask.dueDate ?? '').trim();
    if (!raw) return false;
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (!match) return false;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    const isRealDate =
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day;
    if (!isRealDate) return false;
    const todayStart = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    return parsed >= todayStart;
  }

  getSaveErrorHint(): string {
    if (!this.hasValidTitle()) return '*Title is required';
    if (!this.hasValidDueDate()) return '*Date must be today or later (dd/mm/yyyy)';
    if (!this.hasValidCategory()) return '*Category is required';
    return '*Please check required fields';
  }

  whichPriority(priority: string): boolean {
    return this.editedTask.priority === priority;
  }

  setPriority(priority: string): void {
    this.editedTask.priority = priority;
  }

  getUserForTask(): IContact[] {
    return this.fbService.contactsArray.filter(user =>
      user.name.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.surname.toLowerCase().includes(this.filterAssignedUsers.toLowerCase()) ||
      user.email.toLowerCase().includes(this.filterAssignedUsers.toLowerCase())
    );
  }

  isUserAssigned(user: IContact): boolean {
    return this.editedTask.assignTo.some(u => u.id === user.id);
  }

  toggleUserAssignment(user: IContact): void {
    const idx = this.editedTask.assignTo.findIndex(u => u.id === user.id);
    if (idx > -1) {
      this.editedTask.assignTo.splice(idx, 1);
    } else {
      this.editedTask.assignTo.push(user);
    }
  }

  toggleAssignDropdown(): void {
    this.showAssignDropdown = !this.showAssignDropdown;
  }

  toggleCategoryDropdown(): void {
    this.showCategoryDropdown = !this.showCategoryDropdown;
  }

  setCategory(categoryName: string): void {
    this.currentCategory = categoryName;
    const cat = this.categoryOptions.find(c => c.name === categoryName);
    if (cat) {
      this.editedTask.category.category = 0;
      this.editedTask.category.categoryProperties[0] = { name: cat.name, color: cat.color };
      this.showCategoryDropdown = false;
    }
  }

  dataIsSet(): boolean {
    return this.currentCategory !== 'Select task category';
  }

  closeDropdowns(event: Event): void {
    const target = event.target as HTMLElement;
    const cls = target.getAttribute('class') ?? '';
    if (!['', 'ng', 'fi', 'us', 'dr', 'ca', 'dN'].includes(cls.slice(0, 2))) {
      this.showAssignDropdown = false;
      this.showCategoryDropdown = false;
    }
  }

  addSubtask(): void {
    if (!this.subtaskInput.trim()) return;
    this.editedTask.subTasks.push({ subtaskTitle: this.subtaskInput.trim(), subtaskCompleted: false, onEdit: false });
    this.subtaskInput = '';
  }

  editSubtask(oldTitle: string, newTitle: string): void {
    const st = this.editedTask.subTasks.find(s => s.subtaskTitle === oldTitle);
    if (st) { st.subtaskTitle = newTitle; st.onEdit = false; }
  }

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
