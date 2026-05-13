import { ITask } from '../interfaces/i-task';

export interface BoardColumns {
  'to-do': ITask[];
  'in-progress': ITask[];
  'await-feedback': ITask[];
  'done': ITask[];
}

/**
 * Clears all board columns while keeping the original array references intact.
 * @param {BoardColumns} columns - Mutable board column arrays.
 * @returns {void} No return value.
 */
export function clearBoardColumns(columns: BoardColumns): void {
  columns['to-do'].length = 0;
  columns['in-progress'].length = 0;
  columns['await-feedback'].length = 0;
  columns['done'].length = 0;
}

/**
 * Populates the board columns from a filtered task list.
 * @param {ITask[]} tasks - Filtered task list.
 * @param {BoardColumns} columns - Mutable board column arrays.
 * @returns {void} No return value.
 */
export function populateBoardColumns(tasks: ITask[], columns: BoardColumns): void {
  /**
   * Returns tasks of one status sorted by saved board position.
   * @param {ITask['status']} status - Board status key.
   * @returns {ITask[]} Sorted tasks for the requested status.
   */
  const byStatus = (status: ITask['status']) =>
    tasks.filter(task => task.status === status).sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0));

  columns['to-do'].push(...byStatus('to-do'));
  columns['in-progress'].push(...byStatus('in-progress'));
  columns['await-feedback'].push(...byStatus('await-feedback'));
  columns['done'].push(...byStatus('done'));
}

/**
 * Rebuilds the board column arrays from the current task list and search term.
 * @param {ITask[]} tasks - Full task list.
 * @param {string} searchTerm - Normalized search term.
 * @param {BoardColumns} columns - Mutable board column arrays.
 * @returns {void} No return value.
 */
export function syncBoardColumns(tasks: ITask[], searchTerm: string, columns: BoardColumns): void {
  clearBoardColumns(columns);
  populateBoardColumns(getFilteredBoardTasks(tasks, searchTerm), columns);
}

/**
 * Returns the task array for a given board status.
 * @param {string} status - Board status key.
 * @param {BoardColumns} columns - Mutable board column arrays.
 * @returns {ITask[]} Array for the requested status.
 */
export function getBoardColumnArray(status: string, columns: BoardColumns): ITask[] {
  return columns[status as keyof BoardColumns] || [];
}

/**
 * Maps a drag-and-drop container id to a board status.
 * @param {string} containerId - CDK drop-list id.
 * @returns {ITask['status']} Matching board status.
 */
export function getBoardStatusFromContainerId(containerId: string): ITask['status'] {
  switch (containerId) {
    case 'getTaskCollumnOne':
      return 'to-do';
    case 'getTaskCollumnTwo':
      return 'in-progress';
    case 'getTaskCollumnThree':
      return 'await-feedback';
    case 'getTaskCollumnFour':
      return 'done';
    default:
      return 'to-do';
  }
}

/**
 * Resolves the adjacent board status for up/down moves.
 * @param {ITask['status']} status - Current task status.
 * @param {'up' | 'down'} direction - Requested move direction.
 * @returns {ITask['status'] | undefined} Adjacent status or undefined when out of range.
 */
export function getAdjacentBoardStatus(status: ITask['status'], direction: 'up' | 'down'): ITask['status'] | undefined {
  const statusLevelMap: Record<ITask['status'], number> = {
    'to-do': 1,
    'in-progress': 2,
    'await-feedback': 3,
    'done': 4
  };
  const reverseStatusLevelMap: Record<number, ITask['status']> = {
    1: 'to-do',
    2: 'in-progress',
    3: 'await-feedback',
    4: 'done'
  };
  const newStatusLevel = direction === 'up' ? statusLevelMap[status] - 1 : statusLevelMap[status] + 1;
  return reverseStatusLevelMap[newStatusLevel];
}

export type UpdateTaskFn = (dbid: string | undefined, payload: Record<string, unknown>) => Promise<void>;

/**
 * Transfers a task between two board columns.
 * @param {ITask} task - Task being moved.
 * @param {ITask[]} sourceColumn - Source column array.
 * @param {ITask[]} targetColumn - Target column array.
 * @param {ITask['status']} targetStatus - New status for the task.
 * @returns {void} No return value.
 */
export function moveTaskBetweenColumns(task: ITask, sourceColumn: ITask[], targetColumn: ITask[], targetStatus: ITask['status']): void {
  const sourceIndex = sourceColumn.findIndex(item => item.dbid === task.dbid);
  if (sourceIndex > -1) sourceColumn.splice(sourceIndex, 1);
  task.status = targetStatus;
  targetColumn.push(task);
}

/**
 * Builds the Firestore update promises for a single ordered column.
 * @param {ITask[]} columnData - Ordered column data.
 * @param {UpdateTaskFn} updateTask - Firestore update callback.
 * @returns {Promise<void>[]} Firestore update promises.
 */
export function buildPositionUpdates(columnData: ITask[], updateTask: UpdateTaskFn): Promise<void>[] {
  return columnData.map((task, index) => {
    task.positionIndex = index;
    return updateTask(task.dbid, { positionIndex: index });
  });
}

/**
 * Persists the position indices for one column.
 * @param {ITask[]} columnData - Ordered column data.
 * @param {UpdateTaskFn} updateTask - Firestore update callback.
 * @returns {Promise<void>} Promise resolved after all updates complete.
 */
export async function persistColumnPositions(columnData: ITask[], updateTask: UpdateTaskFn): Promise<void> {
  await Promise.all(buildPositionUpdates(columnData, updateTask));
}

/**
 * Persists the moved task and the updated column order after a mobile menu move.
 * @param {ITask} task - Task being moved.
 * @param {ITask[]} sourceColumn - Source column after removal.
 * @param {ITask[]} targetColumn - Target column after insert.
 * @param {ITask['status']} targetStatus - Target task status.
 * @param {UpdateTaskFn} updateTask - Firestore update callback.
 * @returns {Promise<void>} Promise resolved after all updates complete.
 */
export async function persistMovedTask(task: ITask, sourceColumn: ITask[], targetColumn: ITask[], targetStatus: ITask['status'], updateTask: UpdateTaskFn): Promise<void> {
  if (!task.dbid) return;
  const targetIndex = targetColumn.length - 1;
  await updateTask(task.dbid, { status: targetStatus, positionIndex: targetIndex });
  await Promise.all([persistColumnPositions(sourceColumn, updateTask), persistColumnPositions(targetColumn, updateTask)]);
}

/**
 * Updates position indices in source and destination columns after a cross-column move.
 * @param {ITask[]} previousColumn - Source column data.
 * @param {ITask[]} currentColumn - Destination column data.
 * @param {UpdateTaskFn} updateTask - Firestore update callback.
 * @returns {Promise<void>} Promise resolved after all updates complete.
 */
export async function updateColumnPositionsAfterMove(previousColumn: ITask[], currentColumn: ITask[], updateTask: UpdateTaskFn): Promise<void> {
  await Promise.all([...buildPositionUpdates(previousColumn, updateTask), ...buildPositionUpdates(currentColumn, updateTask)]);
}

/**
 * Filters tasks by search term across title and description.
 * @param {ITask[]} tasks - Full task list.
 * @param {string} searchTerm - Normalized search term.
 * @returns {ITask[]} Filtered tasks that match the search term.
 */
export function getFilteredBoardTasks(tasks: ITask[], searchTerm: string): ITask[] {
  if (!searchTerm) return tasks;
  return tasks.filter(task => {
    const titleMatch = task.title?.toLowerCase().includes(searchTerm) || false;
    const descriptionMatch = task.description?.toLowerCase().includes(searchTerm) || false;
    return titleMatch || descriptionMatch;
  });
}