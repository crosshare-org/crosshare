import * as BA from './bitArray';
import {
  GridBase,
  EntryBase,
  EntryWithPattern,
  valAt,
  setVal,
  entriesFromCells,
  getCrosses,
} from './gridBase';
import { matchingBitmap, minCost, updateBitmap, numMatches } from './WordDB';

interface AutofillEntry extends EntryBase {
  length: number; // Length in chars - might be different than cells.length due to rebus
  bitmap: BA.BitArray | null;
  minCost: number;
}

export interface AutofillGrid extends GridBase<AutofillEntry> {
  usedWords: Set<string>;
}

/* Get a lower bound on total cost of the grid as filled in. */
export function minGridCost(grid: AutofillGrid) {
  let cost = 0;
  grid.entries.forEach((e) => (cost += e.minCost));
  return cost;
}

export function numMatchesForEntry(entry: AutofillEntry) {
  return numMatches(entry.length, entry.bitmap);
}

/*
 * Get a new grid with an entry filled out.
 *
 * This is for autofilling purposes, so the values in the new fill cannot
 * conflict with anything existing in the grid.
 */
export function gridWithEntryDecided(
  grid: AutofillGrid,
  entryIndex: number,
  word: string,
  cost: number
): AutofillGrid | null {
  const newGrid: AutofillGrid = {
    ...grid,
    usedWords: new Set(grid.usedWords),
    cells: grid.cells.slice(),
    entries: grid.entries.slice(),
  };

  const entry = newGrid.entries[entryIndex];
  if (entry === undefined) {
    throw new Error('oob');
  }
  newGrid.usedWords.add(word);
  const crosses = getCrosses(newGrid, entry);
  let j = -1;
  for (let i = 0; i < word.length; i += 1) {
    j += 1;
    const cellPos = entry.cells[j];
    if (cellPos === undefined) {
      throw new Error('oob');
    }
    const currentVal = valAt(newGrid, cellPos);
    if (currentVal !== ' ') {
      if (currentVal === word.slice(i, i + currentVal.length)) {
        // No change needed for this cell
        i = i + currentVal.length - 1;
        continue;
      } else {
        throw new Error(
          'Cell has conflicting value: ' + currentVal + ',' + word + ',' + i
        );
      }
    }

    const letter = word[i];
    if (letter === undefined) {
      throw new Error('oob');
    }

    // update cells
    setVal(newGrid, cellPos, letter);

    // update crossing entry
    const crossObj = crosses[j];
    if (crossObj === undefined) {
      throw new Error('oob');
    }
    const crossIndex = crossObj.entryIndex;
    if (crossIndex === null) {
      continue;
    }
    const cross = newGrid.entries[crossIndex];
    if (cross === undefined) {
      throw new Error('oob');
    }
    let crossWord: string | null = '';
    cross.cells.forEach((cid) => {
      crossWord += valAt(newGrid, cid);
    });
    const crossBitmap = updateBitmap(
      cross.length,
      cross.bitmap,
      crossObj.wordIndex,
      letter
    );

    if (BA.isZero(crossBitmap)) {
      // empty bitmap means invalid grid
      return null;
    }

    if (crossWord.indexOf(' ') === -1) {
      newGrid.usedWords.add(crossWord);
    } else {
      crossWord = null;
    }

    newGrid.entries[crossIndex] = {
      ...cross,
      bitmap: crossBitmap,
      completedWord: crossWord,
      minCost: minCost(cross.length, crossBitmap),
    };
  }

  // update entry itself
  newGrid.entries[entryIndex] = {
    ...entry,
    bitmap: null,
    completedWord: word,
    minCost: cost,
  };

  return newGrid;
}

export function stableSubsets(
  grid: AutofillGrid,
  prelimSubset: Set<number> | null
) {
  let openEntries = grid.entries.filter((e) => !e.completedWord);
  if (prelimSubset !== null) {
    openEntries = openEntries.filter((e) => prelimSubset.has(e.index));
  }

  const assignments = new Map<number, number>();

  function addSubset(entry: AutofillEntry, num: number) {
    if (assignments.has(entry.index)) {
      return;
    }
    if (prelimSubset !== null && !prelimSubset.has(entry.index)) {
      throw new Error('Bad assignment ' + entry.index + ':' + prelimSubset);
    }
    assignments.set(entry.index, num);
    getCrosses(grid, entry).forEach((c) => {
      if (c.entryIndex === null) {
        return;
      }
      const cross = grid.entries[c.entryIndex];
      if (cross === undefined) {
        throw new Error('oob');
      }
      const cellPos = cross.cells[c.cellIndex];
      if (cellPos === undefined) {
        throw new Error('oob');
      }
      if (valAt(grid, cellPos) === ' ') {
        addSubset(cross, num);
      }
    });
  }

  let subsetNumber = 0;
  openEntries.forEach((e) => {
    addSubset(e, subsetNumber);
    subsetNumber += 1;
  });

  const inv = new Map<number, Set<number>>();
  assignments.forEach((val, key) => {
    const newVal = inv.get(val) || new Set<number>();
    newVal.add(key);
    inv.set(val, newVal);
  });
  return Array.from(inv.values());
}

export function addAutofillFieldsToEntry<Entry extends EntryWithPattern>(
  baseEntry: Entry
) {
  const entryBitmap = matchingBitmap(baseEntry.pattern);
  return {
    ...baseEntry,
    length: baseEntry.pattern.length,
    bitmap: entryBitmap,
    minCost: minCost(baseEntry.pattern.length, entryBitmap),
  };
}

export function fromTemplate(
  template: string[],
  width: number,
  height: number
): AutofillGrid {
  const cells = template.map((c) => c.toUpperCase().replace('#', '.'));
  const usedWords = new Set<string>();
  const [baseEntries, entriesByCell] = entriesFromCells(width, height, cells);

  const entries = baseEntries.map((baseEntry) => {
    if (baseEntry.completedWord) {
      usedWords.add(baseEntry.completedWord);
    }
    return addAutofillFieldsToEntry(baseEntry);
  });

  return { width, height, usedWords, cells, entriesByCell, entries };
}
