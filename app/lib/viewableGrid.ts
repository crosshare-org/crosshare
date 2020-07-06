import {
  GridBase, EntryBase,
  posForIndex, cellIndex, valAt, entryAtPosition, entriesFromCells
} from './gridBase';
import { ClueT, Position, Direction, PosAndDir, BLOCK } from './types';
import { Symmetry } from '../reducers/reducer';

export interface ViewableEntry extends EntryBase {
  labelNumber: number,
}

export interface CluedEntry extends ViewableEntry {
  clue: string,
}

export interface ViewableGrid<Entry extends ViewableEntry> extends GridBase<Entry> {
  sortedEntries: Array<number>;
  cellLabels: Map<number, number>,
  allowBlockEditing: boolean,
  highlighted: Set<number>,
  highlight: 'circle' | 'shade',
  mapper(entry: ViewableEntry): Entry,
}

export interface CluedGrid extends ViewableGrid<CluedEntry> {
  clues: Array<ClueT>,
}

export function getSortedEntries<Entry extends EntryBase>(entries: Array<Entry>) {
  return [...entries].sort((a, b) => {
    if (a.direction !== b.direction) {
      return a.direction - b.direction;
    }
    return a.index - b.index;
  }).map(e => e.index);
}

export function moveLeft<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, active: Position): Position {
  let x = active.col;
  while (x >= 0) {
    x -= 1;
    if (x >= 0 && (grid.allowBlockEditing || valAt(grid, { ...active, col: x }) !== BLOCK)) {
      break;
    }
  }
  if (x < 0) {
    return active;
  }
  return { ...active, col: x };
}

export function moveRight<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, active: Position): Position {
  let x = active.col;
  while (x < grid.width) {
    x += 1;
    if (x < grid.width && (grid.allowBlockEditing || valAt(grid, { ...active, col: x }) !== BLOCK)) {
      break;
    }
  }
  if (x >= grid.width) {
    return active;
  }
  return { ...active, col: x };
}

export function moveUp<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, active: Position): Position {
  let y = active.row;
  while (y >= 0) {
    y -= 1;
    if (y >= 0 && (grid.allowBlockEditing || valAt(grid, { ...active, row: y }) !== BLOCK)) {
      break;
    }
  }
  if (y < 0) {
    return active;
  }
  return { ...active, row: y };
}

export function moveDown<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, active: Position): Position {
  let y = active.row;
  while (y < grid.height) {
    y += 1;
    if (y < grid.height && (grid.allowBlockEditing || valAt(grid, { ...active, row: y }) !== BLOCK)) {
      break;
    }
  }
  if (y >= grid.height) {
    return active;
  }
  return { ...active, row: y };
}

export function retreatPosition<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, pos: PosAndDir): PosAndDir {
  const [entry, index] = entryAtPosition(grid, pos);
  if (entry !== null && index > 0) {
    return { ...entry.cells[index - 1], dir: pos.dir };
  }
  if (grid.allowBlockEditing) {
    const xincr = (pos.dir === Direction.Across) ? -1 : 0;
    const yincr = (pos.dir === Direction.Down) ? -1 : 0;
    if ((pos.row + yincr >= 0) && (pos.col + xincr >= 0)) {
      return { row: pos.row + yincr, col: pos.col + xincr, dir: pos.dir };
    }
  }
  return pos;
}

export function nextCell<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, pos: PosAndDir): PosAndDir {
  const [entry, index] = entryAtPosition(grid, pos);
  if (entry !== null && index < entry.cells.length - 1) {
    return { ...entry.cells[index + 1], dir: pos.dir };
  }
  if (grid.allowBlockEditing) {
    const xincr = (pos.dir === Direction.Across) ? 1 : 0;
    const yincr = (pos.dir === Direction.Down) ? 1 : 0;
    if ((pos.row + yincr < grid.height) && (pos.col + xincr < grid.width)) {
      return { row: pos.row + yincr, col: pos.col + xincr, dir: pos.dir };
    }
  }
  return pos;
}

export function nextNonBlock<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, pos: Position) {
  const index = cellIndex(grid, pos);
  for (let offset = 0; offset < grid.cells.length; offset += 1) {
    if (grid.cells[(index + offset) % grid.cells.length] !== BLOCK) {
      return posForIndex(grid, index + offset);
    }
  }
  return pos;
}

export function advancePosition<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, pos: PosAndDir, wrongCells: Set<number>): PosAndDir {
  const [entry, index] = entryAtPosition(grid, pos);
  if (!entry) {
    return pos;
  }
  for (let offset = 0; offset < entry.cells.length; offset += 1) {
    const cell = entry.cells[(index + offset + 1) % entry.cells.length];
    if (valAt(grid, cell) === ' ' || wrongCells.has(cellIndex(grid, cell))) {
      return { ...cell, dir: pos.dir };
    }
  }
  if (index === entry.cells.length - 1) {
    return moveToNextEntry(grid, pos);
  }
  return { ...entry.cells[index + 1], dir: pos.dir };
}

export function moveToPrevEntry<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, pos: PosAndDir): PosAndDir {
  return moveToNextEntry(grid, pos, true);
}

export function moveToNextEntry<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, pos: PosAndDir, reverse = false): PosAndDir {
  const [currentEntry,] = entryAtPosition(grid, pos);
  if (!currentEntry) {
    const xincr = (pos.dir === Direction.Across) ? 1 : 0;
    const yincr = (pos.dir === Direction.Down) ? 1 : 0;
    let iincr = xincr + yincr * grid.width;
    if (reverse) {
      iincr *= -1;
    }
    return { ...posForIndex(grid, (cellIndex(grid, pos) + iincr) % (grid.width * grid.height)), dir: pos.dir };
  }

  // Find position in the sorted array of entries
  let i = 0;
  for (; i < grid.sortedEntries.length; i += 1) {
    if (currentEntry.index === grid.sortedEntries[i]) {
      break;
    }
  }

  // Now find the next entry in the sorted array that isn't complete
  for (let offset = 0; offset < grid.sortedEntries.length; offset += 1) {
    let index = (i + offset + 1) % grid.sortedEntries.length;
    if (reverse) {
      index = (i + grid.sortedEntries.length - offset - 1) % grid.sortedEntries.length;
    }
    const tryEntry = grid.entries[grid.sortedEntries[index]];
    if (tryEntry.completedWord === null) {
      for (const cell of tryEntry.cells) {
        if (valAt(grid, cell) === ' ') {
          return { ...cell, dir: tryEntry.direction };
        }
      }
    }
  }

  // Now just return the start of the next/prev entry
  let index = (i + 1) % grid.sortedEntries.length;
  if (reverse) {
    index = (i - 1) % grid.sortedEntries.length;
  }
  const nextEntry = grid.entries[grid.sortedEntries[index]];
  return { ...nextEntry.cells[0], dir: nextEntry.direction };
}

export function gridWithNewChar<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(grid: Grid, pos: Position, char: string, sym: Symmetry): Grid {
  const index = pos.row * grid.width + pos.col;
  const cells = [...grid.cells];
  if (valAt(grid, pos) === BLOCK) {
    if (!grid.allowBlockEditing) {
      return grid;
    }

    const flippedCell = flipped(grid, pos, sym);
    if (flippedCell !== null && cells[flippedCell] === BLOCK) {
      cells[flippedCell] = ' ';
    }
  }
  cells[index] = char;
  return fromCells({ ...grid, cells });
}

function flipped<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(grid: Grid, pos: Position, sym: Symmetry): number | null {
  switch (sym) {
  case Symmetry.None:
    return null;
  case Symmetry.Rotational:
    return (grid.height - pos.row - 1) * grid.width + (grid.width - pos.col - 1);
  case Symmetry.Horizontal:
    return (grid.height - pos.row - 1) * grid.width + pos.col;
  case Symmetry.Vertical:
    return pos.row * grid.width + (grid.width - pos.col - 1);
  case Symmetry.DiagonalNESW:
    return (grid.height - pos.col - 1) * grid.width + (grid.width - pos.row - 1);
  case Symmetry.DiagonalNWSE:
    return pos.col * grid.width + pos.row;
  }
}

export function gridWithBlockToggled<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(grid: Grid, pos: Position, sym: Symmetry): Grid {
  let char = BLOCK;
  if (valAt(grid, pos) === BLOCK) {
    char = ' ';
  }
  const index = pos.row * grid.width + pos.col;
  const cells = [...grid.cells];
  cells[index] = char;

  const flippedCell = flipped(grid, pos, sym);
  if (flippedCell !== null) {
    cells[flippedCell] = char;
  }

  return fromCells({ ...grid, cells });
}

function cluesByDirection(rawClues: Array<ClueT>) {
  const clues = [new Map<number, string>(), new Map<number, string>()];
  for (const clue of rawClues) {
    clues[clue.dir].set(clue.num, clue.clue);
  }
  return clues;
}

export function addClues<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(
  grid: Grid, rawClues: Array<ClueT>): CluedGrid {
  const clues = cluesByDirection(rawClues);

  function mapper(e: Entry): CluedEntry {
    const clue = clues[e.direction].get(e.labelNumber);
    if (!clue) {
      throw new Error('Can\'t find clue for ' + e.labelNumber + ' ' + e.direction);
    }
    return { ...e, clue };
  }

  const entries: Array<CluedEntry> = [];
  for (const entry of grid.entries) {
    entries.push(mapper(entry));
  }
  return { ...grid, mapper: (e) => mapper(grid.mapper(e)), clues: rawClues, entries };
}

export function fromCells<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(
  input: Omit<Grid, 'entries' | 'entriesByCell' | 'sortedEntries' | 'cellLabels'>
): Grid {

  const [baseEntries, entriesByCell] = entriesFromCells(input.width, input.height, input.cells);

  const cellLabels = new Map<number, number>();
  let currentCellLabel = 1;
  const entries: Array<Entry> = [];
  for (const baseEntry of baseEntries) {
    const startPos = baseEntry.cells[0];
    const i = startPos.row * input.width + startPos.col;
    const entryLabel = cellLabels.get(i) || currentCellLabel;
    if (!cellLabels.has(i)) {
      cellLabels.set(i, currentCellLabel);
      currentCellLabel += 1;
    }
    entries.push(input.mapper({
      ...baseEntry,
      labelNumber: entryLabel,
    }));
  }
  return {
    ...input,
    sortedEntries: getSortedEntries(entries),
    entriesByCell,
    entries,
    cellLabels,
  } as Grid; // TODO remove assertion after this is fixed: https://github.com/microsoft/TypeScript/issues/28884#issuecomment-448356158
}
