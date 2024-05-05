import { entryWord, hasUnches } from '../lib/gridBase';
import { parseClueEnumeration, parseClueReferences } from '../lib/parse';
import { emptySelection, hasMultipleCells } from '../lib/selection';
import { ViewableEntry, entryString } from '../lib/viewableGrid';
import type { BuilderState } from './builderReducer';
import type { GridInterfaceState } from './gridReducer';

export function isBuilderState(
  state: GridInterfaceState
): state is BuilderState {
  return state.type === 'builder';
}

export function postEdit(
  state: BuilderState,
  _cellIndex: number
): BuilderState {
  return validateGrid(state);
}

export function validateGrid(state: BuilderState) {
  let gridIsComplete = true;
  const repeats = new Set<string>();
  let hasNoShortWords = true;

  for (const cell of state.grid.cells) {
    if (cell.trim() === '') {
      gridIsComplete = false;
      break;
    }
  }

  for (const [i, entry] of state.grid.entries.entries()) {
    if (entry.cells.length <= 2) {
      hasNoShortWords = false;
    }
    for (let j = 0; j < state.grid.entries.length; j += 1) {
      if (entry.completedWord === null) continue;
      if (i === j) continue;
      if (entryWord(state.grid, i) === entryWord(state.grid, j)) {
        repeats.add(entryWord(state.grid, i));
      }
    }
  }

  return {
    ...state,
    gridIsComplete,
    repeats,
    hasNoShortWords,
  };
}

export function forEachCluedEntry(
  sortedEntries: BuilderState['grid']['sortedEntries'],
  entries: BuilderState['grid']['entries'],
  clues: BuilderState['clues'],
  callback: (
    entry: ViewableEntry,
    clue: string,
    word: string,
    clueIndex: number
  ) => void
): void {
  const wordCounts = new Map<string, number>();
  for (const entryIndex of sortedEntries) {
    const entry = entries[entryIndex];
    if (!entry) {
      continue;
    }

    const word = entry.completedWord ?? '';
    const clueIndex = wordCounts.get(word) ?? 0;
    wordCounts.set(word, clueIndex + 1);
    const clueString = clues[word]?.[clueIndex] ?? '';
    callback(entry, clueString, word, clueIndex);
  }
}

export function getWarningStats(state: BuilderState) {
  const { clues, grid } = state;
  const { entries, sortedEntries } = grid;

  const shortWords = new Set<string>();

  for (const [i, entry] of entries.entries()) {
    if (entry.cells.length <= 2) {
      shortWords.add(entryWord(grid, i));
    }
  }

  const unmatchedRefs = new Set<string>();
  const missingEnums = new Set<string>();
  const wrongEnums = new Set<string>();

  const digitsRegex = /(\d+)/g;

  const gridEntries = new Set<string>();
  entries.forEach((entry) => {
    gridEntries.add(entryString(entry));
  });

  let numValidClues = 0;
  forEachCluedEntry(sortedEntries, entries, clues, (_entry, clue, word) => {
    clue = clue.trim();
    if (!clue) {
      return;
    }
    numValidClues++;

    const refs = parseClueReferences(clue);
    if (!refs.every((ref) => gridEntries.has(entryString(ref)))) {
      unmatchedRefs.add(word);
    }

    const clueEnum = parseClueEnumeration(clue);
    if (clueEnum == null) {
      missingEnums.add(word);
    } else {
      const length = clueEnum.match(digitsRegex)?.reduce((sum, str) => {
        const val = +str;
        return isNaN(val) ? sum : sum + val;
      }, 0);
      if (length == null || length !== word.length) {
        wrongEnums.add(word);
      }
    }
  });
  const enumsExpected = missingEnums.size < numValidClues / 2;

  return {
    shortWords,
    hasUnches: hasUnches(grid) && !state.userTags.includes('cryptic'),
    unmatchedRefs,
    missingEnums: enumsExpected ? missingEnums : null,
    wrongEnums: enumsExpected ? wrongEnums : null,
  };
}

export function hasSelection<T extends GridInterfaceState>(state: T): boolean {
  return isBuilderState(state) && hasMultipleCells(state.selection);
}

export function clearSelection<T extends GridInterfaceState>(state: T): T {
  if (!isBuilderState(state)) {
    return state;
  }
  if (!hasSelection(state)) {
    return state;
  }
  return {
    ...state,
    selection: emptySelection(),
  };
}
