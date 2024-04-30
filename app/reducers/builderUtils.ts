import { entryWord, hasUnches } from '../lib/gridBase';
import { parseClueEnumeration, parseClueReferences } from '../lib/parse';
import { emptySelection, hasMultipleCells } from '../lib/selection';
import { entryString } from '../lib/viewableGrid';
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

export function getWarningStats(state: BuilderState) {
  const shortWords = new Set<string>();

  for (const [i, entry] of state.grid.entries.entries()) {
    if (entry.cells.length <= 2) {
      shortWords.add(entryWord(state.grid, i));
    }
  }

  const unmatchedRefs = new Set<string>();
  const missingEnums = new Set<string>();
  const wrongEnums = new Set<string>();

  const digitsRegex = /(\d+)/g;

  const gridEntries = new Set<string>();
  state.grid.entries.forEach((entry) => {
    gridEntries.add(entryString(entry));
  });

  for (const [word, clues] of Object.entries(state.clues)) {
    for (const clue of clues) {
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
    }
  }
  const enumsExpected = missingEnums.size < Object.keys(state.clues).length / 2;

  return {
    shortWords,
    hasUnches: hasUnches(state.grid) && !state.userTags.includes('cryptic'),
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
