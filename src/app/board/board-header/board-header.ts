import { Component, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'app-board-header',
  imports: [],
  templateUrl: './board-header.html',
  styleUrl: './board-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardHeader {

  searchPhrase: string = '';
  
  addTaskToColumn = output<string>();
  searchTasks = output<string>();

  onSearch(searchPhrase: string): void {
    this.searchPhrase = searchPhrase;
    this.searchTasks.emit(searchPhrase);
  }

  addCard(columnType: string): void {
    this.addTaskToColumn.emit(columnType);
  }

}
