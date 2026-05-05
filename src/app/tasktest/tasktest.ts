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

  gettasks() {
    return this.fbTaskService.tasksArray.sort((a, b) => a.positionIndex - b.positionIndex);
  }

  addTask(newTask: ITask) {
    (newTask.positionIndex < 0 || newTask.positionIndex > 9999 || typeof newTask.positionIndex !== 'number') ? newTask.positionIndex = 0 : null;
    newTask.category.categoryProperties[0].color = this.categoryOptions.categoryProperties[newTask.category.category].color;
    newTask.category.categoryProperties[0].name = this.categoryOptions.categoryProperties[newTask.category.category].name;
    newTask.category.category = 0;
    newTask.createDate = new Date().toISOString();
    this.fbTaskService.createTask(newTask);
    this.task = this.fbTaskService.newTask;
  }

  async deleteTask(taskId?: string) {
    await this.fbTaskService.deleteTask(taskId);
  }

  async updateTask() {
    await this.fbTaskService.updateTask(this.currentTask.dbid, this.currentTask);
  }


  nextTask() {
    if (!this.fbTaskService.tasksArray.length) return;
    this.columnIndex = (this.columnIndex + 1) % this.fbTaskService.tasksArray.length;
    this.currentTask = this.fbTaskService.tasksArray[this.columnIndex];
    this.fbTaskService.currentTask = this.currentTask;
    console.log(this.currentTask, this.columnIndex);

  }

  subtaskEnter(myTask: ITask) {
    if (!myTask || this.subtask.title.trim() === '') {
      return;
    }
    myTask.subTasks.push({ subtaskTitle: this.subtask.title, subtaskCompleted: false, onEdit: false });
    this.subtask = { title: '', completed: false, onEdit: false};
  }

  openCalendar(target: 'task' | 'currentTask') {
    this.calendarTarget = target;
    this.showCalendar = true;
  }

  closeCalendar() {
    this.showCalendar = false;
  }

  selectDate(date: Date) {
    if (date < new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate())) {
      return; // Verhindere Auswahl von Terminen in der Vergangenheit
    }

    // Formatiere Datum korrekt ohne Zeitzonenproblem
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

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
  }

  nextMonth() {
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

  onDayClick(day: number) {
    if (!this.isDayInPast(day)) {
      this.selectDate(new Date(this.currentYear, this.currentMonth, day));
    }
  }


  getUserForTask() {
    return this.fbService.contactsArray;
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
    if (!assignedUsers) {
      assignedUsers = [];
    }
    
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

}



