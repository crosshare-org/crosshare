import { Position, Direction, PosAndDir } from './types';

export interface EntryBase {
  index: number,
  direction: Direction,
  cells: Array<Position>,
  isComplete: boolean,
  pattern: string,
}

export interface Cross {
  entryIndex: number|null, // Entry index
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

export function entriesByCell<Entry extends EntryBase>(grid: GridBase<Entry>, pos: Position) {
  return grid.entriesByCell[pos.row * grid.width + pos.col];
}

/**
 * Given an entry, get the crossing entries.
 *
 * Returns an array of (entry index, letter idx w/in that entry) of crosses.
 */
export function getCrosses<Entry extends EntryBase>(grid: GridBase<Entry>, entry:Entry): Array<Cross> {
  const crossDir = (entry.direction === Direction.Across) ? Direction.Down : Direction.Across;
  const crosses: Array<Cross> = [];
  entry.cells.forEach((cellIndex) => {
    crosses.push(entriesByCell(grid, cellIndex)[crossDir]);
  })
  return crosses;
}

export function valAt<Entry extends EntryBase>(grid: GridBase<Entry>, pos: Position) {
  return grid.cells[pos.row * grid.width + pos.col];
}

export function entryWord<Entry extends EntryBase>(grid: GridBase<Entry>, entryIndex: number) {
  return grid.entries[entryIndex].cells.map((pos) => valAt(grid, pos)).join("");
}

export function setVal<Entry extends EntryBase>(grid: GridBase<Entry>, pos: Position, val: string) {
  grid.cells[pos.row * grid.width + pos.col] = val;
}

export function cellIndex<Entry extends EntryBase>(grid: GridBase<Entry>, pos: Position) {
  return pos.row * grid.width + pos.col;
}

export function posForIndex<Entry extends EntryBase>(grid: GridBase<Entry>, index: number) {
  return {col: index % grid.width, row: Math.floor(index / grid.width) % grid.height};
}

export function toString<Entry extends EntryBase>(grid: GridBase<Entry>) {
  let s = ""
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      s += grid.cells[y * grid.width + x] + " ";
    }
    s += "\n";
  }
  return s;
}

export function entryAtPosition<Entry extends EntryBase>(grid: GridBase<Entry>, pos: PosAndDir): [Entry | null, number] {
  const entriesAtCell = entriesByCell(grid, pos);
  const currentEntryIndex = entriesAtCell[pos.dir];
  if (currentEntryIndex.entryIndex === null) {
    return [null, 0];
  }
  return [grid.entries[currentEntryIndex.entryIndex], currentEntryIndex.wordIndex];
}

export function entryAndCrossAtPosition<Entry extends EntryBase>(grid: GridBase<Entry>, pos: PosAndDir): [Entry | null, Entry | null] {
  const entries = entriesByCell(grid, pos);
  if (!entries) {
    return [null,null];
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

export function entriesFromCells(width: number, height: number, cells: Array<string>): [Array<EntryBase>, Array<[Cross, Cross]>] {
  const entriesByCell: Array<[Cross, Cross]> = [];
  cells.forEach(() => {
    entriesByCell.push(
      [
        {entryIndex: null, wordIndex: 0, cellIndex: 0},
        {entryIndex: null, wordIndex: 0, cellIndex: 0}
      ]
    );
  });

  const entries: Array<EntryBase> = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = x + y * width;
      for (let dir of ([Direction.Across, Direction.Down])) {
        const xincr = (dir === Direction.Across) ? 1 : 0;
        const yincr = (dir === Direction.Down) ? 1 : 0;
        const iincr = xincr + yincr * width;
        const isStartOfRow = (dir === Direction.Across && x === 0) ||
          (dir === Direction.Down && y === 0);
        const isStartOfEntry = (cells[i] !== '.' &&
          (isStartOfRow || cells[i-iincr] === '.') &&
          (x + xincr < width && y + yincr < height && cells[i+iincr] !== '.'));

        if (!isStartOfEntry) {
          continue;
        }

        const entryCells: Position[] = [];
        let entryPattern = "";
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
          entriesByCell[cellId][dir] = {entryIndex: entries.length, wordIndex: entryPattern.length, cellIndex: wordlen};
          if (cellVal === ' ') {
            isComplete = false;
          }
          entryCells.push({row: yt, col: xt});
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
          isComplete: isComplete,
        });
      }
    }
  }
  return [entries, entriesByCell];
}
