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

  /**
   * Updates local search state and emits the search phrase.
   * @param {string} searchPhrase - Search input value.
   * @returns {void} No return value.
   */
  onSearch(searchPhrase: string): void {
    this.searchPhrase = searchPhrase;
    this.searchTasks.emit(searchPhrase);
  }

  /**
   * Requests opening the add-task flow for a specific column.
   * @param {string} columnType - Target board column status key.
   * @returns {void} No return value.
   */
  addCard(columnType: string): void {
    this.addTaskToColumn.emit(columnType);
  }

}
