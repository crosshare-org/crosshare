import { cellIndex, entryAtPosition, valAt } from '../lib/gridBase.js';
import {
  BLOCK,
  CheatUnit,
  NonEmptyArray,
  Position,
  Symmetry,
} from '../lib/types.js';
import { checkGrid } from '../lib/utils.js';
import { gridWithNewChar } from '../lib/viewableGrid.js';
import type { GridInterfaceState } from './gridReducer.js';
import type { PuzzleState } from './puzzleReducer.js';

export function isPuzzleState(state: GridInterfaceState): state is PuzzleState {
  return state.type === 'puzzle';
}

export type CheatablePuzzleState = Pick<
  PuzzleState,
  | 'verifiedCells'
  | 'revealedCells'
  | 'wrongCells'
  | 'grid'
  | 'solutions'
  | 'cellsIterationCount'
  | 'cellsUpdatedAt'
  | 'cellsEverMarkedWrong'
  | 'active'
  | 'bankedSeconds'
  | 'currentTimeWindowStart'
  | 'filled'
  | 'success'
  | 'dismissedKeepTrying'
>;

function discrepancies(grid: string[], soln: string[]): number {
  let count = 0;
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] !== soln[i]) {
      count += 1;
    }
  }
  return count;
}

export function closestAlt(
  grid: string[],
  solutions: NonEmptyArray<string[]>
): string[] {
  const [head, ...rest] = solutions;
  let closest = head;
  let discrep = discrepancies(grid, closest);
  for (const other of rest) {
    const newDiscrep = discrepancies(grid, other);
    if (newDiscrep < discrep) {
      discrep = newDiscrep;
      closest = other;
    }
  }
  return closest;
}

function cheatCells<T extends CheatablePuzzleState>(
  elapsed: number,
  state: T,
  cellsToCheck: Position[],
  isReveal: boolean
): T {
  const revealedCells = new Set(state.revealedCells);
  const verifiedCells = new Set(state.verifiedCells);
  const wrongCells = new Set(state.wrongCells);
  let grid = state.grid;
  const answers = closestAlt(state.grid.cells, state.solutions);

  for (const cell of cellsToCheck) {
    const ci = cellIndex(state.grid, cell);
    const shouldBe = answers[ci];
    if (shouldBe === undefined) {
      throw new Error('oob');
    }
    if (shouldBe === BLOCK) {
      continue;
    }
    const currentVal = valAt(state.grid, cell);
    if (shouldBe === currentVal) {
      verifiedCells.add(ci);
      wrongCells.delete(ci);
    } else if (isReveal) {
      revealedCells.add(ci);
      wrongCells.delete(ci);
      verifiedCells.add(ci);
      grid = gridWithNewChar(grid, cell, shouldBe, Symmetry.None);
      state.cellsUpdatedAt[ci] = elapsed;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      state.cellsIterationCount[ci]! += 1;
    } else if (currentVal.trim()) {
      revealedCells.delete(ci);
      wrongCells.add(ci);
      verifiedCells.delete(ci);
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

export function cheat<T extends CheatablePuzzleState>(
  state: T,
  cheatUnit: CheatUnit,
  isReveal: boolean
): T {
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

export function checkComplete<T extends CheatablePuzzleState>(state: T): T {
  const [filled, success] = checkGrid(state.grid.cells, state.solutions);
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

export function getCurrentTime(
  state: Pick<PuzzleState, 'bankedSeconds' | 'currentTimeWindowStart'>
): number {
  if (state.currentTimeWindowStart === 0) {
    return state.bankedSeconds;
  }
  return (
    state.bankedSeconds +
    (new Date().getTime() - state.currentTimeWindowStart) / 1000
  );
}
