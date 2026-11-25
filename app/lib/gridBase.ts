import {
  ALL_DIRECTIONS,
  BLOCK,
  Direction,
  DIRECTION_COUNT,
  directionIncrement,
  EMPTY,
  enabledDirections,
  PosAndDir,
  Position,
} from './types.js';

export interface EntryBase {
  index: number;
  direction: Direction;
  cells: Position[];
  completedWord: string | null;
}

export interface EntryWithPattern extends EntryBase {
  pattern: string;
}

export interface Cross {
  entryIndex: number | null; // Entry index
  cellIndex: number; // Position of the crossing in the entry.cells array
  wordIndex: number; // Position of the crossing in the resultant string (could be different due to rebus)
}

export type EntriesByCell = Cross[];

export function emptyCross(): Cross {
  return { entryIndex: null, wordIndex: 0, cellIndex: 0 };
}

export function emptyEntriesByCell(): EntriesByCell {
  return ALL_DIRECTIONS.map(() => emptyCross());
}

export interface GridBase<Entry extends EntryBase> {
  width: number;
  height: number;
  cells: string[];
  /** Per-cell array indexed by Direction; unused dirs have entryIndex null. */
  entriesByCell: EntriesByCell[];
  entries: Entry[];
  vBars: Set<number>;
  hBars: Set<number>;
  /** When true, diagonal entries are computed alongside Across/Down. */
  diagonals: boolean;
}

export function hasUnches<Entry extends EntryBase>(
  grid: GridBase<Entry>
): boolean {
  for (const crosses of grid.entriesByCell) {
    if (crosses[0]?.entryIndex !== null && crosses[1]?.entryIndex === null) {
      return true;
    }
    if (crosses[0]?.entryIndex === null && crosses[1]?.entryIndex !== null) {
      return true;
    }
  }
  return false;
}

function entriesByCellAt<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: Position
): EntriesByCell {
  const entries = grid.entriesByCell[pos.row * grid.width + pos.col];
  if (entries === undefined) {
    throw new Error('out of bounds in entriesByCell');
  }
  return entries;
}

/**
 * Given an entry, get the crossing Across/Down entries.
 *
 * Returns an array of (entry index, letter idx w/in that entry) of crosses.
 * Checking pair remains Across↔Down even when diagonals are enabled.
 */
export function getCrosses<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  entry: Entry
): Cross[] {
  const crossDir =
    entry.direction === Direction.Across ? Direction.Down : Direction.Across;
  const crosses: Cross[] = [];
  entry.cells.forEach((cellIndex) => {
    const cross = entriesByCellAt(grid, cellIndex)[crossDir];
    if (cross === undefined) {
      throw new Error('cross oob');
    }
    crosses.push(cross);
  });
  return crosses;
}

export function valAt<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: Position
): string {
  const res = grid.cells[pos.row * grid.width + pos.col];
  if (res === undefined) {
    throw new Error('out of bounds valAt');
  }
  return res;
}

export function entryWord<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  entryIndex: number
): string {
  const entry = grid.entries[entryIndex];
  if (entry === undefined) {
    throw new Error('entry oob');
  }
  return entry.cells.map((pos) => valAt(grid, pos)).join('');
}

export function setVal<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: Position,
  val: string
) {
  grid.cells[pos.row * grid.width + pos.col] = val;
}

export function cellIndex<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: Position
) {
  return pos.row * grid.width + pos.col;
}

export function posForIndex<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  index: number
) {
  return {
    col: index % grid.width,
    row: Math.floor(index / grid.width) % grid.height,
  };
}

export function isInBounds<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: Position
): boolean {
  return (
    pos.col >= 0 &&
    pos.col < grid.width &&
    pos.row >= 0 &&
    pos.row < grid.height
  );
}

export function isIndexInBounds<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  index: number
): boolean {
  return index >= 0 && index < grid.width * grid.height;
}

export function isInDirection(posA: PosAndDir, posB: Position): boolean {
  switch (posA.dir) {
    case Direction.Across:
      return posA.row === posB.row;
    case Direction.Down:
      return posA.col === posB.col;
    case Direction.Diagonal:
      return posA.row - posA.col === posB.row - posB.col;
    case Direction.DiagonalDownLeft:
      return posA.row + posA.col === posB.row + posB.col;
  }
}

export function clampInBounds<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: PosAndDir
): PosAndDir {
  return {
    row: Math.min(grid.height - 1, Math.max(0, pos.row)),
    col: Math.min(grid.width - 1, Math.max(0, pos.col)),
    dir: pos.dir,
  };
}

export function entryIndexAtPosition<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: PosAndDir
): number | null {
  const entriesAtCell = entriesByCellAt(grid, pos);
  const currentEntryIndex = entriesAtCell[pos.dir];
  if (currentEntryIndex === undefined) {
    throw new Error('dir oob');
  }
  return currentEntryIndex.entryIndex;
}

export function entryAtPosition<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: PosAndDir
): [Entry | null, number] {
  const entriesAtCell = entriesByCellAt(grid, pos);
  const currentEntryIndex = entriesAtCell[pos.dir];
  if (currentEntryIndex === undefined) {
    throw new Error('dir oob');
  }
  if (currentEntryIndex.entryIndex === null) {
    return [null, 0];
  }
  const entry = grid.entries[currentEntryIndex.entryIndex];
  if (entry === undefined) {
    throw new Error('entry oob');
  }
  return [entry, currentEntryIndex.cellIndex];
}

export function entryAndCrossAtPosition<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: PosAndDir
): [Entry | null, Entry | null] {
  const entries = entriesByCellAt(grid, pos);
  const currentEntry = entries[pos.dir];
  const crossDir =
    pos.dir === Direction.Across ? Direction.Down : Direction.Across;
  const currentCross = entries[crossDir];
  if (currentEntry === undefined || currentCross === undefined) {
    throw new Error('dir oob');
  }
  return [
    (currentEntry.entryIndex !== null &&
      grid.entries[currentEntry.entryIndex]) ||
      null,
    (currentCross.entryIndex !== null &&
      grid.entries[currentCross.entryIndex]) ||
      null,
  ];
}

/** Directions that have an entry at the given cell, in enum order. */
export function directionsAtPosition<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: Position
): Direction[] {
  const entries = entriesByCellAt(grid, pos);
  const dirs: Direction[] = [];
  for (let dir = 0; dir < DIRECTION_COUNT; dir += 1) {
    if (entries[dir]?.entryIndex !== null) {
      dirs.push(dir);
    }
  }
  return dirs;
}

/** Next direction at this cell after `current`, wrapping. */
export function nextDirectionAtPosition<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: Position,
  current: Direction
): Direction {
  const dirs = directionsAtPosition(grid, pos);
  if (dirs.length === 0) {
    return current;
  }
  const idx = dirs.indexOf(current);
  if (idx === -1) {
    return dirs[0] ?? current;
  }
  return dirs[(idx + 1) % dirs.length] ?? current;
}

export function getEntryCells<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: PosAndDir
) {
  let highlights: Position[] = [];
  const entry = entryAtPosition(grid, pos);
  if (entry[0] !== null) {
    highlights = entry[0].cells;
  }
  return highlights;
}

export function entriesFromCells(
  width: number,
  height: number,
  cells: string[],
  vBars: Set<number>,
  hBars: Set<number>,
  diagonals = false
): [EntryWithPattern[], EntriesByCell[]] {
  const entriesByCell: EntriesByCell[] = [];
  cells.forEach(() => {
    entriesByCell.push(emptyEntriesByCell());
  });

  const entries: EntryWithPattern[] = [];
  const dirs = enabledDirections(diagonals);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = x + y * width;
      for (const dir of dirs) {
        const { row: yincr, col: xincr } = directionIncrement(dir);
        const prevX = x - xincr;
        const prevY = y - yincr;
        const nextX = x + xincr;
        const nextY = y + yincr;
        const useBars = dir === Direction.Across || dir === Direction.Down;
        const iBars = dir === Direction.Across ? vBars : hBars;

        const prevInBounds =
          prevX >= 0 && prevX < width && prevY >= 0 && prevY < height;
        const nextInBounds =
          nextX >= 0 && nextX < width && nextY >= 0 && nextY < height;

        const prevCellId = prevY * width + prevX;
        const nextCellId = nextY * width + nextX;

        const prevIsBlockOrBar =
          !prevInBounds ||
          cells[prevCellId] === BLOCK ||
          (useBars && iBars.has(prevCellId));

        const currentHasBar = useBars && iBars.has(i);
        const nextIsOpen =
          nextInBounds && cells[nextCellId] !== BLOCK && !currentHasBar;

        const isStartOfEntry =
          cells[i] !== BLOCK && prevIsBlockOrBar && nextIsOpen;

        if (!isStartOfEntry) {
          continue;
        }

        const entryCells: Position[] = [];
        let entryPattern = '';
        let isComplete = true;
        let xt = x;
        let yt = y;
        let wordlen = 0;
        while (xt >= 0 && xt < width && yt >= 0 && yt < height) {
          const cellId = yt * width + xt;
          const cellVal = cells[cellId];
          const entry = entriesByCell[cellId];
          if (cellVal === undefined || entry === undefined) {
            throw new Error('cellid oob');
          }
          if (cellVal === BLOCK) {
            break;
          }
          entry[dir] = {
            entryIndex: entries.length,
            wordIndex: entryPattern.length,
            cellIndex: wordlen,
          };
          if (cellVal === EMPTY || cellVal === '') {
            isComplete = false;
          }
          entryCells.push({ row: yt, col: xt });
          entryPattern += cellVal;
          xt += xincr;
          yt += yincr;
          wordlen += 1;

          if (useBars && iBars.has(cellId)) {
            break;
          }
        }
        entries.push({
          index: entries.length,
          pattern: entryPattern,
          direction: dir,
          cells: entryCells,
          completedWord: isComplete ? entryPattern : null,
        });
      }
    }
  }
  return [entries, entriesByCell];
}

/*
 * Get a new grid with an entry filled out.
 *
 * This is for builder use.
 *
 * If you know the new fill doesn't conflict with the existing grid, use
 * `gridWithEntryDecided` instead for better performance.
 */
export function gridWithEntrySet<
  Entry extends EntryBase,
  Grid extends GridBase<Entry>,
>(grid: Grid, entryIndex: number, word: string): Grid {
  const newGrid: Grid = {
    ...grid,
    cells: grid.cells.slice(),
    entries: grid.entries.slice(),
  };

  const entry = newGrid.entries[entryIndex];
  if (entry === undefined) {
    throw new Error('entryIndex oob');
  }
  const crosses = getCrosses(newGrid, entry);
  let j = -1;
  for (let i = 0; i < word.length; i += 1) {
    j += 1;
    const pos = entry.cells[j];
    if (pos === undefined) {
      throw new Error('oob');
    }
    const currentVal = valAt(newGrid, pos);
    if (currentVal !== ' ') {
      if (currentVal === word.slice(i, i + currentVal.length)) {
        // No change needed for this cell
        i = i + currentVal.length - 1;
        continue;
      }
    }

    const newLetter = word[i];
    if (newLetter === undefined) {
      throw new Error('oob');
    }
    // update cells
    setVal(newGrid, pos, newLetter);

    // update crossing entry
    const crossIndex = crosses[j]?.entryIndex ?? null;
    if (crossIndex === null) {
      continue;
    }
    const cross = newGrid.entries[crossIndex];
    if (cross === undefined) {
      throw new Error('oob');
    }
    let completedCross: string | null = '';
    for (const cid of cross.cells) {
      const val = valAt(newGrid, cid);
      if (val === ' ') {
        completedCross = null;
        break;
      } else {
        completedCross += val;
      }
    }
    cross.completedWord = completedCross;
  }
  // update entry itself
  entry.completedWord = word;

  return newGrid;
}
