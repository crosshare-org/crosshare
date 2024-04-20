import { entryWord } from "../lib/gridBase";
import { emptySelection, hasMultipleCells } from "../lib/selection";
import type { BuilderState } from "./builderReducer";
import type { GridInterfaceState } from "./gridReducer";

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