import equal from 'fast-deep-equal/es6';
import type { Root } from 'hast';
import { toString } from 'hast-util-to-string';
import {
  EntryBase,
  GridBase,
  cellIndex,
  entriesFromCells,
  entryAtPosition,
  isInDirection,
  isIndexInBounds,
  posForIndex,
  valAt,
} from './gridBase.js';
import { parseClueReferences } from './parse.js';
import { AccountPrefsFlagsT } from './prefs.js';
import {
  BLOCK,
  ClueT,
  Direction,
  EMPTY,
  PosAndDir,
  Position,
  Symmetry,
  directionString,
  isSamePosition,
} from './types.js';

export interface ViewableEntry extends EntryBase {
  labelNumber: number;
}

export interface CluedEntry extends ViewableEntry {
  clue: string;
  clueHast: Root;
}

export interface ViewableGrid<Entry extends ViewableEntry>
  extends GridBase<Entry> {
  sortedEntries: number[];
  cellLabels: Map<number, number>;
  allowBlockEditing: boolean;
  highlighted: Set<number>;
  hidden: Set<number>;
  highlight: 'circle' | 'shade';
  mapper(entry: ViewableEntry): Entry;
}

export interface CluedGrid extends ViewableGrid<CluedEntry> {
  clues: ClueT[];
}

export function entryString(entry: {
  labelNumber: number;
  direction: Direction;
}): string {
  return `${entry.labelNumber}${directionString(entry.direction)}`;
}

function getSortedEntries<Entry extends EntryBase>(entries: Entry[]) {
  return [...entries]
    .sort((a, b) => {
      if (a.direction !== b.direction) {
        return a.direction - b.direction;
      }
      return a.index - b.index;
    })
    .map((e) => e.index);
}

export function moveLeft<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  active: Position
): Position {
  let x = active.col;
  while (x >= 0) {
    x -= 1;
    if (
      x >= 0 &&
      (grid.allowBlockEditing || valAt(grid, { ...active, col: x }) !== BLOCK)
    ) {
      break;
    }
  }
  if (x < 0) {
    return active;
  }
  return { ...active, col: x };
}

export function moveRight<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  active: Position
): Position {
  let x = active.col;
  while (x < grid.width) {
    x += 1;
    if (
      x < grid.width &&
      (grid.allowBlockEditing || valAt(grid, { ...active, col: x }) !== BLOCK)
    ) {
      break;
    }
  }
  if (x >= grid.width) {
    return active;
  }
  return { ...active, col: x };
}

export function moveUp<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  active: Position
): Position {
  let y = active.row;
  while (y >= 0) {
    y -= 1;
    if (
      y >= 0 &&
      (grid.allowBlockEditing || valAt(grid, { ...active, row: y }) !== BLOCK)
    ) {
      break;
    }
  }
  if (y < 0) {
    return active;
  }
  return { ...active, row: y };
}

export function moveDown<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  active: Position
): Position {
  let y = active.row;
  while (y < grid.height) {
    y += 1;
    if (
      y < grid.height &&
      (grid.allowBlockEditing || valAt(grid, { ...active, row: y }) !== BLOCK)
    ) {
      break;
    }
  }
  if (y >= grid.height) {
    return active;
  }
  return { ...active, row: y };
}

export function retreatPosition<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: PosAndDir
): PosAndDir {
  const [entry, index] = entryAtPosition(grid, pos);
  if (entry !== null && index > 0) {
    const cell = entry.cells[index - 1];
    if (cell === undefined) {
      throw new Error('oob');
    }
    return { ...cell, dir: pos.dir };
  }
  if (grid.allowBlockEditing) {
    const xincr = pos.dir === Direction.Across ? -1 : 0;
    const yincr = pos.dir === Direction.Down ? -1 : 0;
    if (pos.row + yincr >= 0 && pos.col + xincr >= 0) {
      return { row: pos.row + yincr, col: pos.col + xincr, dir: pos.dir };
    }
    return pos;
  }
  if (entry === null) {
    return pos;
  }
  // Now go to the end of the previous entry
  let i = 0;
  for (; i < grid.sortedEntries.length; i += 1) {
    if (entry.index === grid.sortedEntries[i]) {
      break;
    }
  }
  const prevIndex =
    (grid.sortedEntries.length + i - 1) % grid.sortedEntries.length;
  const entryIndex = grid.sortedEntries[prevIndex];
  if (entryIndex === undefined) {
    throw new Error('oob');
  }
  const prevEntry = grid.entries[entryIndex];
  if (prevEntry === undefined) {
    throw new Error('oob');
  }
  const cell = prevEntry.cells[prevEntry.cells.length - 1];
  if (cell === undefined) {
    throw new Error('oob');
  }
  return { ...cell, dir: prevEntry.direction };
}

export function nextCell<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: PosAndDir
): PosAndDir {
  const [entry, index] = entryAtPosition(grid, pos);
  if (entry !== null && index < entry.cells.length - 1) {
    const cell = entry.cells[index + 1];
    if (cell === undefined) {
      throw new Error('oob');
    }
    return { ...cell, dir: pos.dir };
  }
  if (grid.allowBlockEditing) {
    const xincr = pos.dir === Direction.Across ? 1 : 0;
    const yincr = pos.dir === Direction.Down ? 1 : 0;
    if (pos.row + yincr < grid.height && pos.col + xincr < grid.width) {
      return { row: pos.row + yincr, col: pos.col + xincr, dir: pos.dir };
    }
  }
  return pos;
}

export function nextNonBlock<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: Position
) {
  const index = cellIndex(grid, pos);
  for (let offset = 0; offset < grid.cells.length; offset += 1) {
    if (grid.cells[(index + offset) % grid.cells.length] !== BLOCK) {
      return posForIndex(grid, index + offset);
    }
  }
  return pos;
}

export function advancePosition<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: PosAndDir,
  wrongCells: Set<number>,
  prefs: AccountPrefsFlagsT | undefined
): PosAndDir {
  const [entry, index] = entryAtPosition(grid, pos);
  if (!entry) {
    return pos;
  }
  // First try for the next empty square
  if (!prefs?.dontSkipCompleted) {
    for (let offset = 0; offset < entry.cells.length; offset += 1) {
      const cell = entry.cells[(index + offset + 1) % entry.cells.length];
      if (cell === undefined) {
        throw new Error('oob');
      }
      if (valAt(grid, cell) === ' ' || wrongCells.has(cellIndex(grid, cell))) {
        return { ...cell, dir: pos.dir };
      }
    }
  }

  // If we're at the end of the word and it's complete, advance to next entry
  if (index === entry.cells.length - 1 && entry.completedWord) {
    if (prefs?.dontAdvanceWordAfterCompletion) {
      return pos;
    } else {
      return moveToNextEntry(grid, pos);
    }
  }

  // Just advance to the next cell in order
  const cell = entry.cells[(index + 1) % entry.cells.length];
  if (cell === undefined) {
    throw new Error('oob');
  }
  return { ...cell, dir: pos.dir };
}

export function moveToPrevEntry<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: PosAndDir
): PosAndDir {
  return moveToNextEntry(grid, pos, true);
}

export function moveToNextEntry<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: PosAndDir,
  reverse = false
): PosAndDir {
  const [currentEntry] = entryAtPosition(grid, pos);
  if (!currentEntry) {
    const xincr = pos.dir === Direction.Across ? 1 : 0;
    const yincr = pos.dir === Direction.Down ? 1 : 0;
    let iincr = xincr + yincr * grid.width;
    if (reverse) {
      iincr *= -1;
    }
    return {
      ...posForIndex(
        grid,
        (cellIndex(grid, pos) + grid.width * grid.height + iincr) %
          (grid.width * grid.height)
      ),
      dir: pos.dir,
    };
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
      index =
        (i + 2 * grid.sortedEntries.length - offset - 1) %
        grid.sortedEntries.length;
    }
    const entryIndex = grid.sortedEntries[index];
    if (entryIndex === undefined) {
      throw new Error('oob');
    }
    const tryEntry = grid.entries[entryIndex];
    if (tryEntry === undefined) {
      throw new Error('oob');
    }
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
    index = (grid.sortedEntries.length + i - 1) % grid.sortedEntries.length;
  }
  const entryIndex = grid.sortedEntries[index];
  if (entryIndex === undefined) {
    throw new Error('oob');
  }
  const nextEntry = grid.entries[entryIndex];
  if (nextEntry === undefined) {
    throw new Error('oob');
  }
  const firstCell = nextEntry.cells[0];
  if (firstCell === undefined) {
    throw new Error('oob');
  }
  return {
    ...firstCell,
    dir: nextEntry.direction,
  };
}

export function moveToEntryInActiveDirection<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: PosAndDir,
  reverse = false
): Position {
  const [currentEntry] = entryAtPosition(grid, pos);
  if (!currentEntry) {
    return pos;
  }

  const { cells } = currentEntry;
  const startCell = reverse ? cells[0] : cells[cells.length - 1];
  if (!startCell) {
    return pos;
  }

  const xincr = pos.dir === Direction.Across ? 1 : 0;
  const yincr = pos.dir === Direction.Down ? 1 : 0;
  let iincr = xincr + yincr * grid.width;
  if (reverse) {
    iincr *= -1;
  }

  let ci = cellIndex(grid, startCell) + iincr;
  let newPos = posForIndex(grid, ci);
  while (isIndexInBounds(grid, ci) && isInDirection(pos, newPos)) {
    const [newEntry] = entryAtPosition(grid, { ...newPos, dir: pos.dir });
    if (newEntry && newEntry !== currentEntry) {
      return newPos;
    }
    newPos = posForIndex(grid, (ci += iincr));
  }

  return pos;
}

export function moveToEntry<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: PosAndDir,
  move: (grid: ViewableGrid<Entry>, active: Position) => Position
): Position {
  let oldPos: Position = { ...pos };
  let newPos = move(grid, oldPos);
  while (!isSamePosition(newPos, oldPos)) {
    const [newEntry] = entryAtPosition(grid, { ...newPos, dir: pos.dir });
    if (newEntry) {
      return newPos;
    }
    oldPos = newPos;
    newPos = move(grid, oldPos);
  }

  return pos;
}

export function advanceTo<Entry extends ViewableEntry>(
  grid: ViewableGrid<Entry>,
  pos: PosAndDir,
  newPos: Position,
  wrongCells: Set<number>
): PosAndDir {
  if (isSamePosition(pos, newPos)) {
    return pos;
  }

  const { dir } = pos;
  const [entry] = entryAtPosition(grid, { ...newPos, dir });
  if (!entry) {
    return pos;
  }

  for (const cell of entry.cells) {
    if (valAt(grid, cell) === EMPTY || wrongCells.has(cellIndex(grid, cell))) {
      return { ...cell, dir };
    }
  }

  return { ...newPos, dir };
}

export function gridWithNewChar<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(grid: Grid, pos: Position, char: string, sym: Symmetry): Grid {
  const index = pos.row * grid.width + pos.col;
  const cells = [...grid.cells];
  const hidden = new Set(grid.hidden);
  if (valAt(grid, pos) === BLOCK) {
    if (!grid.allowBlockEditing) {
      return grid;
    }

    const flippedCell = flipped(grid, pos, sym);
    if (flippedCell !== null && cells[flippedCell] === BLOCK) {
      if (hidden.has(index)) {
        hidden.delete(flippedCell);
      }
      cells[flippedCell] = ' ';
    }
  }
  hidden.delete(index);
  cells[index] = char;
  return fromCells({ ...grid, cells, hidden });
}

export function flipped<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(grid: Grid, pos: Position, sym: Symmetry): number | null {
  switch (sym) {
    case Symmetry.None:
      return null;
    case Symmetry.Rotational:
      return (
        (grid.height - pos.row - 1) * grid.width + (grid.width - pos.col - 1)
      );
    case Symmetry.Horizontal:
      return (grid.height - pos.row - 1) * grid.width + pos.col;
    case Symmetry.Vertical:
      return pos.row * grid.width + (grid.width - pos.col - 1);
    case Symmetry.DiagonalNESW:
      return (
        (grid.height - pos.col - 1) * grid.width + (grid.width - pos.row - 1)
      );
    case Symmetry.DiagonalNWSE:
      return pos.col * grid.width + pos.row;
  }
}

function flippedBar<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(
  grid: Grid,
  pos: PosAndDir,
  sym: Symmetry
): [vBar: number | null, hBar: number | null] {
  switch (sym) {
    case Symmetry.None:
      return [null, null];
    case Symmetry.Rotational: {
      const flipCell =
        (grid.height - pos.row - 1) * grid.width + (grid.width - pos.col - 1);
      if (pos.dir === Direction.Across) {
        return [flipCell - 1, null];
      } else {
        return [null, flipCell - grid.width];
      }
    }
    case Symmetry.Horizontal: {
      const flipCell = (grid.height - pos.row - 1) * grid.width + pos.col;
      if (pos.dir === Direction.Across) {
        return [flipCell, null];
      } else {
        return [null, flipCell - grid.width];
      }
    }
    case Symmetry.Vertical: {
      const flipCell = pos.row * grid.width + (grid.width - pos.col - 1);
      if (pos.dir === Direction.Across) {
        return [flipCell - 1, null];
      } else {
        return [null, flipCell];
      }
    }
    case Symmetry.DiagonalNESW: {
      const flipCell =
        (grid.height - pos.col - 1) * grid.width + (grid.width - pos.row - 1);
      if (pos.dir === Direction.Across) {
        return [null, flipCell - grid.width];
      } else {
        return [flipCell - 1, null];
      }
    }
    case Symmetry.DiagonalNWSE: {
      const flipCell = pos.col * grid.width + pos.row;
      if (pos.dir === Direction.Across) {
        return [null, flipCell];
      } else {
        return [flipCell, null];
      }
    }
  }
}

function removeExtraneousBars<
  I extends {
    width: number;
    height: number;
    cells: string[];
    vBars: Set<number>;
    hBars: Set<number>;
  }
>(g: I): I {
  const vBars = new Set(g.vBars);
  const hBars = new Set(g.hBars);

  for (const i of g.vBars) {
    const col = i % g.width;
    if (
      col === g.width - 1 ||
      g.cells[i + 1] === BLOCK ||
      g.cells[i] === BLOCK
    ) {
      vBars.delete(i);
    }
  }

  for (const i of g.hBars) {
    const row = Math.floor(i / g.width);
    if (
      row === g.height - 1 ||
      g.cells[i + g.width] === BLOCK ||
      g.cells[i] === BLOCK
    ) {
      hBars.delete(i);
    }
  }

  return { ...g, hBars, vBars };
}

export function gridWithHiddenToggled<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(grid: Grid, pos: Position, sym: Symmetry): Grid {
  const index = pos.row * grid.width + pos.col;
  const wasHidden = grid.hidden.has(index);
  const cells = [...grid.cells];
  const hidden = new Set(grid.hidden);

  if (wasHidden) {
    hidden.delete(index);
  } else {
    cells[index] = BLOCK;
    hidden.add(index);
  }

  const flippedCell = flipped(grid, pos, sym);
  if (flippedCell !== null) {
    if (wasHidden) {
      hidden.delete(flippedCell);
    } else {
      cells[flippedCell] = BLOCK;
      hidden.add(flippedCell);
    }
  }

  return fromCells(removeExtraneousBars({ ...grid, cells, hidden }));
}

export function gridWithBlockToggled<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(grid: Grid, pos: Position, sym: Symmetry): Grid {
  let char = BLOCK;
  if (valAt(grid, pos) === BLOCK) {
    char = ' ';
  }
  const index = pos.row * grid.width + pos.col;
  const cells = [...grid.cells];
  const hidden = new Set(grid.hidden);
  hidden.delete(index);
  cells[index] = char;

  const flippedCell = flipped(grid, pos, sym);
  if (flippedCell !== null) {
    hidden.delete(flippedCell);
    cells[flippedCell] = char;
  }

  return fromCells(removeExtraneousBars({ ...grid, cells, hidden }));
}

export function gridWithBarToggled<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(grid: Grid, pos: PosAndDir, sym: Symmetry): Grid {
  const index = pos.row * grid.width + pos.col;
  const [flippedVBar, flippedHBar] = flippedBar(grid, pos, sym);

  const vBars = new Set(grid.vBars);
  const hBars = new Set(grid.hBars);
  if (pos.dir === Direction.Across) {
    if (pos.col === grid.width - 1) return grid;
    if (vBars.has(index)) {
      vBars.delete(index);
      if (flippedVBar !== null) vBars.delete(flippedVBar);
      if (flippedHBar !== null) hBars.delete(flippedHBar);
    } else {
      vBars.add(index);
      if (flippedVBar !== null) vBars.add(flippedVBar);
      if (flippedHBar !== null) hBars.add(flippedHBar);
    }
  } else {
    if (pos.row === grid.height - 1) return grid;
    if (hBars.has(index)) {
      hBars.delete(index);
      if (flippedVBar !== null) vBars.delete(flippedVBar);
      if (flippedHBar !== null) hBars.delete(flippedHBar);
    } else {
      hBars.add(index);
      if (flippedVBar !== null) vBars.add(flippedVBar);
      if (flippedHBar !== null) hBars.add(flippedHBar);
    }
  }
  return fromCells(removeExtraneousBars({ ...grid, vBars, hBars }));
}

export function getCluedAcrossAndDown<Entry extends ViewableEntry>(
  clueMap: Record<string, string[]>,
  entries: Entry[],
  sortedEntries: number[],
  markdownToHast: (text: string) => Root
): [CluedEntry[], CluedEntry[]] {
  const wordCounts: Record<string, number> = {};
  const cluedEntries = sortedEntries.map((entryidx) => {
    const e = entries[entryidx];
    if (!e) {
      throw new Error('Bad clue idx');
    }
    const word = e.completedWord ?? '';
    const clueArray = clueMap[word] ?? [];
    const idx = wordCounts[word] ?? 0;
    wordCounts[word] = idx + 1;
    const clueString = clueArray[idx] ?? '';

    return { ...e, clue: clueString, clueHast: markdownToHast(clueString) };
  });
  return [
    cluedEntries.filter((e) => e.direction === Direction.Across),
    cluedEntries.filter((e) => e.direction === Direction.Down),
  ];
}

export function getClueMap<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(grid: Grid, rawClues: ClueT[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const clues = cluesByDirection(rawClues);

  for (const entryIndex of grid.sortedEntries) {
    const entry = grid.entries[entryIndex];

    if (!entry || entry.completedWord === null) {
      continue;
    }
    const cluesForDir = clues[entry.direction];
    if (cluesForDir === undefined) {
      throw new Error('oob');
    }
    const clue = cluesForDir.get(entry.labelNumber);
    if (!clue) {
      continue;
    }
    const prevVal = result[entry.completedWord];
    if (prevVal === undefined) {
      result[entry.completedWord] = [clue];
    } else {
      prevVal.push(clue);
    }
  }
  return result;
}

function cluesByDirection(rawClues: ClueT[]) {
  const clues = [new Map<number, string>(), new Map<number, string>()];
  for (const clue of rawClues) {
    const cluesByDir = clues[clue.dir];
    if (cluesByDir === undefined) {
      throw new Error('oob');
    }
    cluesByDir.set(clue.num, clue.clue);
  }
  return clues;
}

/* Returns a map from ENTRYWORD => '5D: This is the clue'.
 *
 * We use this for comment clue tooltips. */
export function getEntryToClueMap(
  grid: CluedGrid,
  answers: string[]
): Map<string, [number, Direction, string]> {
  const asList: [string, [number, Direction, string]][] = grid.entries.map(
    (e) => {
      return [
        e.cells.map((p) => answers[cellIndex(grid, p)]).join(''),
        [e.labelNumber, e.direction, e.clue],
      ];
    }
  );

  return new Map(asList);
}

/* `refs` is a set of referenced entry indexes for each entry in the grid - we use this
 *    for grid highlights when an entry is selected.
 */
export function getRefs(grid: CluedGrid): Set<number>[] {
  const refsList: Set<number>[] = [];

  for (const e of grid.entries) {
    const refs = new Set<number>();
    if (!e.clue.startsWith('!@')) {
      for (const res of parseClueReferences(e.clue)) {
        const entryIndex = grid.entries.findIndex(
          (e) =>
            e.labelNumber === res.labelNumber && e.direction === res.direction
        );
        if (entryIndex !== -1) {
          refs.add(entryIndex);
        }
      }
    }

    const lowerClue = e.clue.toLowerCase();
    for (const starTerm of ['starred', '*ed', '*']) {
      for (const entryTerm of [
        'clues',
        'answers',
        'entries',
        'clue',
        'answer',
        'entry',
      ]) {
        if (lowerClue.includes(` ${starTerm} ${entryTerm}`)) {
          for (const [idx, otherE] of grid.entries.entries()) {
            const clueText = toString(otherE.clueHast);
            if (
              clueText.startsWith('*') ||
              clueText.endsWith('*') ||
              clueText.startsWith('(*)') ||
              clueText.endsWith('(*)')
            ) {
              refs.add(idx);
            }
          }
        }
      }
    }
    refsList.push(refs);
  }

  // Now do backrefs
  refsList.forEach((refs, idx) => {
    for (const refedEntryIdx of refs) {
      const backRefs = refsList[refedEntryIdx];
      if (backRefs === undefined) {
        throw new Error('bad backrefs');
      }
      backRefs.add(idx);
    }
  });

  return refsList;
}

export function addClues<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(
  grid: Grid,
  rawClues: ClueT[],
  clueHasts: Root[] | ((c: string) => Root)
): CluedGrid {
  const clues = cluesByDirection(rawClues);

  function mapper(e: Entry): CluedEntry {
    const cluesByDir = clues[e.direction];
    if (cluesByDir === undefined) {
      throw new Error('oob');
    }
    const clue = cluesByDir.get(e.labelNumber);
    if (clue === undefined) {
      throw new Error(
        "Can't find clue for " + e.labelNumber + ' ' + e.direction
      );
    }
    const clueHast = Array.isArray(clueHasts)
      ? clueHasts[e.index]
      : clueHasts(clue);
    if (clueHast === undefined) {
      throw new Error(
        "Can't find hast for " + e.labelNumber + ' ' + e.direction
      );
    }
    return { ...e, clue, clueHast };
  }

  const entries: CluedEntry[] = [];
  for (const entry of grid.entries) {
    entries.push(mapper(entry));
  }
  return {
    ...grid,
    mapper: (e) => mapper(grid.mapper(e)),
    clues: rawClues,
    entries,
  };
}

export function fromCells<
  Entry extends ViewableEntry,
  Grid extends ViewableGrid<Entry>
>(
  input: Omit<
    Grid,
    'entries' | 'entriesByCell' | 'sortedEntries' | 'cellLabels'
  >
): Grid {
  const [baseEntries, entriesByCell] = entriesFromCells(
    input.width,
    input.height,
    input.cells,
    input.vBars,
    input.hBars
  );

  const cellLabels = new Map<number, number>();
  let currentCellLabel = 1;
  const entries: Entry[] = [];
  for (const baseEntry of baseEntries) {
    const startPos = baseEntry.cells[0];
    if (startPos === undefined) {
      throw new Error('oob');
    }
    const i = startPos.row * input.width + startPos.col;
    const entryLabel = cellLabels.get(i) ?? currentCellLabel;
    if (!cellLabels.has(i)) {
      cellLabels.set(i, currentCellLabel);
      currentCellLabel += 1;
    }
    entries.push(
      input.mapper({
        ...baseEntry,
        labelNumber: entryLabel,
      })
    );
  }
  return {
    ...input,
    sortedEntries: getSortedEntries(entries),
    entriesByCell,
    entries,
    cellLabels,
  } as Grid; // TODO remove assertion after this is fixed: https://github.com/microsoft/TypeScript/issues/28884#issuecomment-448356158
}

export function gridEqual(
  a?: ViewableGrid<ViewableEntry>,
  b?: ViewableGrid<ViewableEntry>
): boolean {
  return (
    equal(a?.cells, b?.cells) &&
    equal(a?.vBars, b?.vBars) &&
    equal(a?.hBars, b?.hBars) &&
    equal(a?.highlighted, b?.highlighted) &&
    equal(a?.hidden, b?.hidden)
  );
}
