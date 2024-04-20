import { cellIndex, entryAtPosition, valAt } from '../lib/gridBase';
import { BLOCK, CheatUnit, Position, Symmetry } from '../lib/types';
import { checkGrid } from '../lib/utils';
import { gridWithNewChar } from '../lib/viewableGrid';
import type { GridInterfaceState } from './gridReducer';
import type { PuzzleState } from './puzzleReducer';

export function isPuzzleState(state: GridInterfaceState): state is PuzzleState {
  return state.type === 'puzzle';
}

function cheatCells(
  elapsed: number,
  state: PuzzleState,
  cellsToCheck: Position[],
  isReveal: boolean
) {
  const revealedCells = new Set(state.revealedCells);
  const verifiedCells = new Set(state.verifiedCells);
  const wrongCells = new Set(state.wrongCells);
  let grid = state.grid;

  for (const cell of cellsToCheck) {
    const ci = cellIndex(state.grid, cell);
    const shouldBe = state.answers[ci];
    if (shouldBe === undefined) {
      throw new Error('oob');
    }
    if (shouldBe === BLOCK) {
      continue;
    }
    const currentVal = valAt(state.grid, cell);
    if (shouldBe === currentVal) {
      verifiedCells.add(ci);
    } else if (isReveal) {
      revealedCells.add(ci);
      wrongCells.delete(ci);
      verifiedCells.add(ci);
      grid = gridWithNewChar(grid, cell, shouldBe, Symmetry.None);
      state.cellsUpdatedAt[ci] = elapsed;
      state.cellsIterationCount[ci] += 1;
    } else if (currentVal.trim()) {
      wrongCells.add(ci);
      state.cellsEverMarkedWrong.add(ci);
    }
  }
  return checkComplete({
    ...state,
    grid,
    wrongCells,
    revealedCells,
    verifiedCells,
  });
}

export function cheat(
  state: PuzzleState,
  cheatUnit: CheatUnit,
  isReveal: boolean
) {
  const elapsed = getCurrentTime(state);
  let cellsToCheck: Position[] = [];
  if (cheatUnit === CheatUnit.Square) {
    cellsToCheck = [state.active];
  } else if (cheatUnit === CheatUnit.Entry) {
    const entry = entryAtPosition(state.grid, state.active)[0];
    if (!entry) {
      //block?
      return state;
    }
    cellsToCheck = entry.cells;
  } else {
    // Puzzle
    for (let rowidx = 0; rowidx < state.grid.height; rowidx += 1) {
      for (let colidx = 0; colidx < state.grid.width; colidx += 1) {
        cellsToCheck.push({ row: rowidx, col: colidx });
      }
    }
  }
  const newState = cheatCells(elapsed, state, cellsToCheck, isReveal);
  return { ...newState, didCheat: true };
}

export function checkComplete(state: PuzzleState) {
  const [filled, success] = checkGrid(
    state.grid.cells,
    state.answers,
    state.alternateSolutions
  );
  if (filled !== state.filled || success !== state.success) {
    let currentTimeWindowStart = state.currentTimeWindowStart;
    let dismissedKeepTrying = state.dismissedKeepTrying;
    let bankedSeconds = state.bankedSeconds;
    // Pause if success or newly filled
    if (currentTimeWindowStart && (success || (filled && !state.filled))) {
      bankedSeconds = getCurrentTime(state);
      currentTimeWindowStart = 0;
      dismissedKeepTrying = false;
    }
    return {
      ...state,
      filled,
      success,
      bankedSeconds,
      currentTimeWindowStart,
      dismissedKeepTrying,
    };
  }
  return state;
}

export function postEdit(state: PuzzleState, cellIndex: number): PuzzleState {
  state.wrongCells.delete(cellIndex);
  if (state.autocheck) {
    return checkComplete(cheat(state, CheatUnit.Square, false));
  }
  return checkComplete(state);
}

export function getCurrentTime(state: PuzzleState) {
  if (state.currentTimeWindowStart === 0) {
    return state.bankedSeconds;
  }
  return (
    state.bankedSeconds +
    (new Date().getTime() - state.currentTimeWindowStart) / 1000
  );
}
