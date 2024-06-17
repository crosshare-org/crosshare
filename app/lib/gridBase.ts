import { BLOCK, Direction, EMPTY, PosAndDir, Position } from './types.js';

export interface EntryBase {
  index: number;
  direction: Direction;
  cells: Position[];
  completedWord: string | null;
}

export interface EntryWithPattern extends EntryBase {
  pattern: string;
}

interface Cross {
  entryIndex: number | null; // Entry index
  cellIndex: number; // Position of the crossing in the entry.cells array
  wordIndex: number; // Position of the crossing in the resultant string (could be different due to rebus)
}

export interface GridBase<Entry extends EntryBase> {
  width: number;
  height: number;
  cells: string[];
  entriesByCell: [Cross, Cross][];
  entries: Entry[];
  vBars: Set<number>;
  hBars: Set<number>;
}

export function hasUnches<Entry extends EntryBase>(
  grid: GridBase<Entry>
): boolean {
  for (const crosses of grid.entriesByCell) {
    if (crosses[0].entryIndex !== null && crosses[1].entryIndex === null) {
      return true;
    }
    if (crosses[0].entryIndex === null && crosses[1].entryIndex !== null) {
      return true;
    }
  }
  return false;
}

function entriesByCell<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: Position
): [Cross, Cross] {
  const entries = grid.entriesByCell[pos.row * grid.width + pos.col];
  if (entries === undefined) {
    throw new Error('out of bounds in entriesByCell');
  }
  return entries;
}

/**
 * Given an entry, get the crossing entries.
 *
 * Returns an array of (entry index, letter idx w/in that entry) of crosses.
 */
export function getCrosses<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  entry: Entry
): Cross[] {
  const crossDir =
    entry.direction === Direction.Across ? Direction.Down : Direction.Across;
  const crosses: Cross[] = [];
  entry.cells.forEach((cellIndex) => {
    crosses.push(entriesByCell(grid, cellIndex)[crossDir]);
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
  const entriesAtCell = entriesByCell(grid, pos);
  const currentEntryIndex = entriesAtCell[pos.dir];
  return currentEntryIndex.entryIndex;
}

export function entryAtPosition<Entry extends EntryBase>(
  grid: GridBase<Entry>,
  pos: PosAndDir
): [Entry | null, number] {
  const entriesAtCell = entriesByCell(grid, pos);
  const currentEntryIndex = entriesAtCell[pos.dir];
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
  const entries = entriesByCell(grid, pos);
  const currentEntry = entries[pos.dir];
  const currentCross =
    entries[pos.dir === Direction.Across ? Direction.Down : Direction.Across];
  return [
    (currentEntry.entryIndex !== null &&
      grid.entries[currentEntry.entryIndex]) ||
      null,
    (currentCross.entryIndex !== null &&
      grid.entries[currentCross.entryIndex]) ||
      null,
  ];
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
  hBars: Set<number>
): [EntryWithPattern[], [Cross, Cross][]] {
  const entriesByCell: [Cross, Cross][] = [];
  cells.forEach(() => {
    entriesByCell.push([
      { entryIndex: null, wordIndex: 0, cellIndex: 0 },
      { entryIndex: null, wordIndex: 0, cellIndex: 0 },
    ]);
  });

  const entries: EntryWithPattern[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = x + y * width;
      for (const dir of [Direction.Across, Direction.Down]) {
        const xincr = dir === Direction.Across ? 1 : 0;
        const yincr = dir === Direction.Down ? 1 : 0;
        const iincr = xincr + yincr * width;
        const iBars = dir === Direction.Across ? vBars : hBars;
        const isStartOfRow =
          (dir === Direction.Across && x === 0) ||
          (dir === Direction.Down && y === 0);
        const isStartOfEntry =
          cells[i] !== '.' &&
          (isStartOfRow || cells[i - iincr] === '.' || iBars.has(i - iincr)) &&
          x + xincr < width &&
          y + yincr < height &&
          cells[i + iincr] !== '.' &&
          !iBars.has(i);

        if (!isStartOfEntry) {
          continue;
        }

        const entryCells: Position[] = [];
        let entryPattern = '';
        let isComplete = true;
        let xt = x;
        let yt = y;
        let wordlen = 0;
        while (xt < width && yt < height) {
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

          if (iBars.has(cellId)) {
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
