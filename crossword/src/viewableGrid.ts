import {
  GridBase, EntryBase,
  posForIndex, cellIndex, valAt, entryAtPosition, entriesFromCells
} from './gridBase';
import { Position, Direction, PosAndDir, BLOCK } from './types';
import { Symmetry } from './reducer';

export interface ViewableEntry extends EntryBase {
  labelNumber: number,
  clue: string,
}

export interface ViewableGrid<Entry extends ViewableEntry> extends GridBase<Entry> {
  sortedEntries: Array<Entry>;
  cellLabels: Map<number, number>,
  allowBlockEditing: boolean,
  acrossClues: Array<string>,
  downClues: Array<string>,
  highlighted: Set<number>,
  highlight: "circle" | "shade" | undefined,
  mapper(entry: ViewableEntry): Entry,
}

export function getSortedEntries<Entry extends EntryBase>(entries: Array<Entry>) {
  return [...entries].sort((a, b) => {
    if (a.direction !== b.direction) {
      return a.direction - b.direction;
    }
    return a.index - b.index;
  })
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
  if (!entry) {
    return pos;
  }
  if (index > 0) {
    return {...entry.cells[index - 1], dir: pos.dir};
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
    if (currentEntry.index === grid.sortedEntries[i].index) {
      break;
    }
  }

  // Now find the next entry in the sorted array that isn't complete
  for (let offset = 0; offset < grid.sortedEntries.length; offset += 1) {
    let index = (i + offset + 1) % grid.sortedEntries.length;
    if (reverse) {
      index = (i + grid.sortedEntries.length - offset - 1) % grid.sortedEntries.length;
    }
    const tryEntry = grid.sortedEntries[index];
    if (!tryEntry.isComplete) {
      for (let cell of tryEntry.cells) {
        if (valAt(grid, cell) === " ") {
          return {...cell, dir: tryEntry.direction};
        }
      }
    }
  }

  return pos;
}

export function gridWithNewChar<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, pos: Position, char: string, sym: Symmetry): ViewableGrid<Entry> {
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
  return fromCells(grid.mapper, grid.width, grid.height, cells, grid.allowBlockEditing, grid.acrossClues, grid.downClues, grid.highlighted, grid.highlight);
}

export function gridWithBlockToggled<Entry extends ViewableEntry>(grid: ViewableGrid<Entry>, pos: Position, sym: Symmetry): ViewableGrid<Entry> {
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
  return fromCells(grid.mapper, grid.width, grid.height, cells, grid.allowBlockEditing, grid.acrossClues, grid.downClues, grid.highlighted, grid.highlight);
}

export function fromCells<Entry extends ViewableEntry>(
  mapper: (entry: ViewableEntry) => Entry,
  width: number, height: number, cells: Array<string>,
  allowBlockEditing: boolean, acrossClues: Array<string>, downClues: Array<string>,
  highlighted: Set<number>, highlight: "circle" | "shade" | undefined
): ViewableGrid<Entry> {

  const [baseEntries, entriesByCell] = entriesFromCells(width, height, cells);

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

  let cellLabels = new Map<number, number>();
  let currentCellLabel = 1;
  const entries: Array<Entry> = [];
  for (const baseEntry of baseEntries) {
    const startPos = baseEntry.cells[0];
    const i = startPos.row * width + startPos.col;
    let entryLabel = cellLabels.get(i) || currentCellLabel;
    if (!cellLabels.has(i)) {
      cellLabels.set(i, currentCellLabel);
      currentCellLabel += 1;
    }
    let entryClue = clues[baseEntry.direction].get(entryLabel);
    if (!entryClue) {
      if (allowBlockEditing) {  // We're constructing a puzzle, so clues can be missing
        entryClue = "";
      } else {
        throw new Error("Can't find clue for " + entryLabel + " " + baseEntry.direction);
      }
    }
    entries.push(mapper({
      ...baseEntry,
      labelNumber: entryLabel,
      clue: entryClue,
    }));
  }
  return {
    mapper,
    sortedEntries: getSortedEntries(entries),
    width,
    height,
    cells,
    entriesByCell,
    entries,
    cellLabels,
    allowBlockEditing,
    acrossClues,
    downClues,
    highlighted,
    highlight
  };
}
