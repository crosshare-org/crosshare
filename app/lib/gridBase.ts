import { Position, Direction, PosAndDir } from './types';

export interface EntryBase {
  index: number,
  direction: Direction,
  cells: Array<Position>,
  completedWord: string | null,
}

export interface EntryWithPattern extends EntryBase {
  pattern: string,
}

interface Cross {
  entryIndex: number | null, // Entry index
  cellIndex: number,       // Position of the crossing in the entry.cells array
  wordIndex: number        // Position of the crossing in the resultant string (could be different due to rebus)
}

export interface GridBase<Entry extends EntryBase> {
  width: number,
  height: number,
  cells: string[],
  entriesByCell: Array<[Cross, Cross]>,
  entries: Entry[]
}

function entriesByCell<Entry extends EntryBase>(grid: GridBase<Entry>, pos: Position) {
  return grid.entriesByCell[pos.row * grid.width + pos.col];
}

/**
 * Given an entry, get the crossing entries.
 *
 * Returns an array of (entry index, letter idx w/in that entry) of crosses.
 */
export function getCrosses<Entry extends EntryBase>(grid: GridBase<Entry>, entry: Entry): Array<Cross> {
  const crossDir = (entry.direction === Direction.Across) ? Direction.Down : Direction.Across;
  const crosses: Array<Cross> = [];
  entry.cells.forEach((cellIndex) => {
    crosses.push(entriesByCell(grid, cellIndex)[crossDir]);
  });
  return crosses;
}

export function valAt<Entry extends EntryBase>(grid: GridBase<Entry>, pos: Position) {
  return grid.cells[pos.row * grid.width + pos.col];
}

export function entryWord<Entry extends EntryBase>(grid: GridBase<Entry>, entryIndex: number) {
  return grid.entries[entryIndex].cells.map((pos) => valAt(grid, pos)).join('');
}

export function setVal<Entry extends EntryBase>(grid: GridBase<Entry>, pos: Position, val: string) {
  grid.cells[pos.row * grid.width + pos.col] = val;
}

export function cellIndex<Entry extends EntryBase>(grid: GridBase<Entry>, pos: Position) {
  return pos.row * grid.width + pos.col;
}

export function posForIndex<Entry extends EntryBase>(grid: GridBase<Entry>, index: number) {
  return { col: index % grid.width, row: Math.floor(index / grid.width) % grid.height };
}

export function entryIndexAtPosition<Entry extends EntryBase>(grid: GridBase<Entry>, pos: PosAndDir): number | null {
  const entriesAtCell = entriesByCell(grid, pos);
  const currentEntryIndex = entriesAtCell[pos.dir];
  return currentEntryIndex.entryIndex;
}

export function entryAtPosition<Entry extends EntryBase>(grid: GridBase<Entry>, pos: PosAndDir): [Entry | null, number] {
  const entriesAtCell = entriesByCell(grid, pos);
  const currentEntryIndex = entriesAtCell[pos.dir];
  if (currentEntryIndex.entryIndex === null) {
    return [null, 0];
  }
  return [grid.entries[currentEntryIndex.entryIndex], currentEntryIndex.cellIndex];
}

export function entryAndCrossAtPosition<Entry extends EntryBase>(grid: GridBase<Entry>, pos: PosAndDir): [Entry | null, Entry | null] {
  const entries = entriesByCell(grid, pos);
  if (!entries) {
    return [null, null];
  }
  const currentEntry = entries[pos.dir];
  const currentCross = entries[(pos.dir + 1) % 2];
  return [
    currentEntry.entryIndex === null ? null : grid.entries[currentEntry.entryIndex],
    currentCross.entryIndex === null ? null : grid.entries[currentCross.entryIndex]
  ];
}

export function getEntryCells<Entry extends EntryBase>(grid: GridBase<Entry>, pos: PosAndDir) {
  let highlights: Array<Position> = [];
  const entry = entryAtPosition(grid, pos);
  if (entry[0] !== null) {
    highlights = entry[0].cells;
  }
  return highlights;
}

export function entriesFromCells(width: number, height: number, cells: Array<string>): [Array<EntryWithPattern>, Array<[Cross, Cross]>] {
  const entriesByCell: Array<[Cross, Cross]> = [];
  cells.forEach(() => {
    entriesByCell.push(
      [
        { entryIndex: null, wordIndex: 0, cellIndex: 0 },
        { entryIndex: null, wordIndex: 0, cellIndex: 0 }
      ]
    );
  });

  const entries: Array<EntryWithPattern> = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = x + y * width;
      for (const dir of ([Direction.Across, Direction.Down])) {
        const xincr = (dir === Direction.Across) ? 1 : 0;
        const yincr = (dir === Direction.Down) ? 1 : 0;
        const iincr = xincr + yincr * width;
        const isStartOfRow = (dir === Direction.Across && x === 0) ||
          (dir === Direction.Down && y === 0);
        const isStartOfEntry = (cells[i] !== '.' &&
          (isStartOfRow || cells[i - iincr] === '.') &&
          (x + xincr < width && y + yincr < height && cells[i + iincr] !== '.'));

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
          if (cellVal === '.') {
            break;
          }
          entriesByCell[cellId][dir] = { entryIndex: entries.length, wordIndex: entryPattern.length, cellIndex: wordlen };
          if (cellVal === ' ') {
            isComplete = false;
          }
          entryCells.push({ row: yt, col: xt });
          entryPattern += cellVal;
          xt += xincr;
          yt += yincr;
          wordlen += 1;
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
export function gridWithEntrySet<Entry extends EntryBase, Grid extends GridBase<Entry>>(grid: Grid, entryIndex: number, word: string): Grid {
  const newGrid: Grid = {
    ...grid,
    cells: grid.cells.slice(),
    entries: grid.entries.slice(),
  };

  const entry = newGrid.entries[entryIndex];
  const crosses = getCrosses(newGrid, entry);
  let j = -1;
  for (let i = 0; i < word.length; i += 1) {
    j += 1;
    const currentVal = valAt(newGrid, entry.cells[j]);
    if (currentVal !== ' ') {
      if (currentVal === word.slice(i, i + currentVal.length)) {
        // No change needed for this cell
        i = i + currentVal.length - 1;
        continue;
      }
    }

    // update cells
    setVal(newGrid, entry.cells[j], word[i]);

    // update crossing entry
    const crossIndex = crosses[j].entryIndex;
    if (crossIndex === null) {
      continue;
    }
    const cross = newGrid.entries[crossIndex];
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
    newGrid.entries[crossIndex].completedWord = completedCross;
  }
  // update entry itself
  newGrid.entries[entryIndex].completedWord = word;

  return newGrid;
}
