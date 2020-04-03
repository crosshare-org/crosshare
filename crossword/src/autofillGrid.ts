import { BigInteger } from '@modern-dev/jsbn';
import {
  GridBase, EntryBase, valAt, setVal, entriesFromCells, getCrosses
} from './gridBase';
import { matchingBitmap, minCost, updateBitmap, numMatches, ZERO } from './WordDB';

export interface AutofillEntry extends EntryBase {
  length: number, // Length in chars - might be different than cells.length due to rebus
  bitmap: BigInteger|null,
  minCost: number
}

export interface AutofillGrid<Entry extends AutofillEntry> extends GridBase<Entry> {
  usedWords: Set<string>,
  mapper(entry: AutofillEntry): Entry
}

/* Get a lower bound on total cost of the grid as filled in. */
export function minGridCost<Entry extends AutofillEntry>(grid: AutofillGrid<Entry>) {
  let cost = 0;
  grid.entries.forEach((e) => cost += e.minCost);
  return cost;
}

export function numMatchesForEntry(entry: AutofillEntry) {
  return numMatches(entry.length, entry.bitmap);
}

export function gridWithEntryDecided<Entry extends AutofillEntry>(grid: AutofillGrid<Entry>, entryIndex: number, word: string): AutofillGrid<Entry>|null {
  const newGrid:AutofillGrid<Entry> = {
    ...grid,
    usedWords: new Set(grid.usedWords),
    cells: grid.cells.slice(),
    entries: grid.entries.slice(),
  };

  const entry = newGrid.entries[entryIndex];
  newGrid.usedWords.add(word);
  const crosses = getCrosses(newGrid, entry);
  let j = -1;
  for (let i = 0; i < word.length; i += 1) {
    j += 1;
    const currentVal = valAt(newGrid, entry.cells[j]);
    if (currentVal !== ' ') {
      if (currentVal === word.slice(i, i + currentVal.length)) {
        // No change needed for this cell
        i = i + currentVal.length - 1;
        continue
      } else {
        throw new Error("Cell has conflicting value: " + currentVal + ',' + word + ',' + i);
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
    let crossWord = '';
    cross.cells.forEach((cid) => {
      crossWord += valAt(newGrid, cid);
    });
    const crossBitmap = updateBitmap(cross.length, cross.bitmap, crosses[j].wordIndex, word[i]);

    if (crossBitmap.equals(ZERO)) {  // empty bitmap means invalid grid
      return null;
    }

    let crossCompleted = false;
    if (crossWord.indexOf(' ') === -1) {
      crossCompleted = true
      newGrid.usedWords.add(crossWord);
    }

    newGrid.entries[crossIndex] = grid.mapper({
      pattern: cross.pattern,
      length: cross.length,
      index: cross.index,
      direction: cross.direction,
      cells: cross.cells,
      bitmap: crossBitmap,
      isComplete: crossCompleted,
      minCost: minCost(cross.length, crossBitmap)
    });
  }

  // update entry itself
  const newBitmap = matchingBitmap(word);
  newGrid.entries[entryIndex] = grid.mapper({
    pattern: entry.pattern,
    length: entry.length,
    index: entry.index,
    direction: entry.direction,
    cells: entry.cells,
    bitmap: newBitmap,
    isComplete: true,
    minCost: minCost(entry.length, newBitmap)
  });

  return newGrid;
}

export function stableSubsets<Entry extends AutofillEntry>(grid: AutofillGrid<Entry>, prelimSubset: Set<number>|null) {
  let openEntries = grid.entries.filter((e) => !e.isComplete);
  if (prelimSubset !== null) {
    openEntries = openEntries.filter((e) => prelimSubset.has(e.index))
  }

  const assignments = new Map<number, number>()

  function addSubset(entry:AutofillEntry, num:number) {
    if (assignments.has(entry.index)) {
      return;
    }
    if (prelimSubset !== null && !prelimSubset.has(entry.index)) {
      throw new Error("Bad assignment " + entry.index + ":" + prelimSubset);
    }
    assignments.set(entry.index, num);
    getCrosses(grid, entry).forEach((c) => {
      if (c.entryIndex === null) {
        return;
      }
      const cross = grid.entries[c.entryIndex];
      if (valAt(grid, cross.cells[c.cellIndex]) === ' ') {
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
  assignments.forEach((val,key) => {
    const newVal = inv.get(val) || new Set<number>();
    newVal.add(key);
    inv.set(val, newVal);
  });
  return Array.from(inv.values());
}

export function fromTemplate<Entry extends AutofillEntry>(
  mapper: (entry: AutofillEntry) => Entry,
  template: string[], width: number, height: number
): AutofillGrid<Entry> {
  const cells = template.map((c) => c.toUpperCase().replace("#", ".")) ;
  const usedWords = new Set<string>();
  const [baseEntries, entriesByCell] = entriesFromCells(width, height, cells);

  const entries = baseEntries.map(baseEntry => {
    const entryBitmap = matchingBitmap(baseEntry.pattern);
    if (baseEntry.isComplete) {
      usedWords.add(baseEntry.pattern);
    }
    return mapper({
      ...baseEntry,
      length: baseEntry.pattern.length,
      bitmap: entryBitmap,
      minCost: minCost(baseEntry.pattern.length, entryBitmap)
    });
  });

  return { mapper, width, height, usedWords, cells, entriesByCell, entries };
}
