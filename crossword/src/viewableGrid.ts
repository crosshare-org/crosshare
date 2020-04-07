import {
  GridBase, EntryBase,
  posForIndex, cellIndex, valAt, entryAtPosition, entriesFromCells
} from './gridBase';
import { Position, Direction, PosAndDir, BLOCK } from './types';
import { Symmetry } from './reducer';

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
  highlight: "circle" | "shade" | undefined,
  mapper(entry: ViewableEntry): Entry,
}

export interface CluedGrid extends ViewableGrid<CluedEntry> {
  acrossClues: Array<string>,
  downClues: Array<string>,
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
    return {...entry.cells[index - 1], dir: pos.dir};
  }
  const xincr = (pos.dir === Direction.Across) ? -1 : 0;
  const yincr = (pos.dir === Direction.Down) ? -1 : 0;
  if (grid.allowBlockEditing && (pos.row + yincr >= 0) && (pos.col + xincr >= 0)) {
    return {row: pos.row + yincr, col: pos.col + xincr, dir: pos.dir};
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
    let cell = entry.cells[(index + offset + 1) % entry.cells.length];
    if (valAt(grid, cell) === " " || wrongCells.has(cellIndex(grid, cell))) {
      return {...cell, dir: pos.dir};
    }
  }
  if (index === entry.cells.length - 1) {
    return moveToNextEntry(grid, pos);
  }
  return {...entry.cells[index + 1], dir: pos.dir};
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
    return {...posForIndex(grid, (cellIndex(grid, pos) + iincr) % (grid.width * grid.height)), dir: pos.dir};
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
      for (let cell of tryEntry.cells) {
        if (valAt(grid, cell) === " ") {
          return {...cell, dir: tryEntry.direction};
        }
      }
    }
  }

  return pos;
}

export function gridWithNewChar<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(grid: Grid, pos: Position, char: string, sym: Symmetry): Grid {
  const index = pos.row * grid.width + pos.col;
  let cells = [...grid.cells];
  if (valAt(grid, pos) === BLOCK) {
    if (!grid.allowBlockEditing) {
      return grid;
    }

    if (sym === Symmetry.Rotational) {
      const flipped = (grid.height - pos.row - 1) * grid.width + (grid.width - pos.col - 1);
      if (cells[flipped] === BLOCK) {
        cells[flipped] = " ";
      }
    } else if (sym === Symmetry.Horizontal) {
      const flipped = (grid.height - pos.row - 1) * grid.width + pos.col;
      if (cells[flipped] === BLOCK) {
        cells[flipped] = " ";
      }
    } else if (sym === Symmetry.Vertical) {
      const flipped = pos.row * grid.width + (grid.width - pos.col - 1);
      if (cells[flipped] === BLOCK) {
        cells[flipped] = " ";
      }
    }
  }
  cells[index] = char;
  return fromCells({...grid, cells});
}

export function gridWithBlockToggled<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(grid: Grid, pos: Position, sym: Symmetry): Grid {
  let char = BLOCK;
  if (valAt(grid, pos) === BLOCK) {
    char = ' ';
  }
  const index = pos.row * grid.width + pos.col;
  let cells = [...grid.cells];
  cells[index] = char;

  if (sym === Symmetry.Rotational) {
    const flipped = (grid.height - pos.row - 1) * grid.width + (grid.width - pos.col - 1);
    cells[flipped] = char;
  } else if (sym === Symmetry.Horizontal) {
    const flipped = (grid.height - pos.row - 1) * grid.width + pos.col;
    cells[flipped] = char;
  } else if (sym === Symmetry.Vertical) {
    const flipped = pos.row * grid.width + (grid.width - pos.col - 1);
    cells[flipped] = char;
  }
  return fromCells({...grid, cells});
}

export function getClueMap<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(grid: Grid, acrossClues: Array<string>, downClues: Array<string>): Map<string, string> {
  const result = new Map<string, string>();
  const clues = cluesByDirection(acrossClues, downClues);

  for (const entry of grid.entries) {
    if (entry.completedWord === null) {
      continue;
    }
    const clue = clues[entry.direction].get(entry.labelNumber);
    if (!clue) {
      continue;
    }
    result.set(entry.completedWord, clue);
  }
  return result;
}

function cluesByDirection(acrossClues: Array<string>, downClues: Array<string>) {
  let clues = [new Map<number, string>(), new Map<number, string>()];
  function setClues(jsonClueList: Array<string>, direction: Direction) {
    for (let clue of jsonClueList) {
      let match = clue.match(/^(\d+)\. (.+)$/);
      if (!match || match.length < 3) {
        throw new Error("Bad clue data: '" + clue + "'");
      }
      const number = +match[1];
      const clueText = match[2];
      clues[direction].set(number, clueText);
    }
  }
  setClues(acrossClues, Direction.Across);
  setClues(downClues, Direction.Down);
  return clues;
}

export function addClues<Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>>(
    grid: Grid, acrossClues: Array<string>, downClues: Array<string>): CluedGrid {
  const clues = cluesByDirection(acrossClues, downClues);

  function mapper(e: Entry): CluedEntry {
    let clue = clues[e.direction].get(e.labelNumber);
    if (!clue) {
      throw new Error("Can't find clue for " + e.labelNumber + " " + e.direction);
    }
    return {...e, clue};
  }

  const entries: Array<CluedEntry> = [];
  for (const entry of grid.entries) {
    entries.push(mapper(entry));
  }
  return {...grid, mapper: (e) => mapper(grid.mapper(e)), acrossClues, downClues, entries};
}

export function fromCells<Entry extends ViewableEntry,
                          Grid extends ViewableGrid<Entry>>(
  input: Omit<Grid, "entries"|"entriesByCell"|"sortedEntries"|"cellLabels">
): Grid {

  const [baseEntries, entriesByCell] = entriesFromCells(input.width, input.height, input.cells);

  let cellLabels = new Map<number, number>();
  let currentCellLabel = 1;
  const entries: Array<Entry> = [];
  for (const baseEntry of baseEntries) {
    const startPos = baseEntry.cells[0];
    const i = startPos.row * input.width + startPos.col;
    let entryLabel = cellLabels.get(i) || currentCellLabel;
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
