import {
  cellIndex,
  clampInBounds,
  isInBounds,
  valAt,
} from '../lib/gridBase.js';
import { forEachPosition, getSelectionCells } from '../lib/selection.js';
import {
  ALLOWABLE_GRID_CHARS,
  BLOCK,
  CELL_DELIMITER,
  Direction,
  EMPTY,
  KeyK,
  PosAndDir,
  Position,
  ROW_DELIMITER,
  Symmetry,
} from '../lib/types.js';
import {
  ToggleSetting,
  ViewableEntry,
  ViewableGrid,
  advancePosition,
  gridWithBlockToggled,
  gridWithNewChar,
  moveDown,
  moveLeft,
  moveRight,
  moveToNextEntry,
  moveToPrevEntry,
  moveUp,
  nextCell,
  retreatPosition,
} from '../lib/viewableGrid.js';
import type { BuilderState } from './builderReducer.js';
import {
  postEdit as builderPostEdit,
  clearSelection,
  hasSelection,
  isBuilderState,
} from './builderUtils.js';
import { PuzzleAction, isKeypressAction } from './commonActions.js';
import type { PuzzleState } from './puzzleReducer.js';
import { isPuzzleState, postEdit as puzzlePostEdit } from './puzzleUtils.js';

export interface GridInterfaceState {
  type: string;
  active: PosAndDir;
  grid: ViewableGrid<ViewableEntry>;
  wasEntryClick: false;
  showExtraKeyLayout: boolean;
  isEnteringRebus: boolean;
  rebusValue: string;
  downsOnly: boolean;
  isEditable(cellIndex: number): boolean;
}

export interface CopyAction extends PuzzleAction {
  type: 'COPY';
  content: string;
}
function isCopyAction(action: PuzzleAction): action is CopyAction {
  return action.type === 'COPY';
}

export interface CutAction extends PuzzleAction {
  type: 'CUT';
  content: string;
}
function isCutAction(action: PuzzleAction): action is CutAction {
  return action.type === 'CUT';
}

export interface PasteAction extends PuzzleAction {
  type: 'PASTE';
  content: string;
}
function isPasteAction(action: PuzzleAction): action is PasteAction {
  return action.type === 'PASTE';
}

export interface ClickedEntryAction extends PuzzleAction {
  type: 'CLICKEDENTRY';
  entryIndex: number;
}
function isClickedEntryAction(
  action: PuzzleAction
): action is ClickedEntryAction {
  return action.type === 'CLICKEDENTRY';
}

export interface SetActivePositionAction extends PuzzleAction {
  type: 'SETACTIVEPOSITION';
  newActive: Position;
  shiftKey: boolean;
}
function isSetActivePositionAction(
  action: PuzzleAction
): action is SetActivePositionAction {
  return action.type === 'SETACTIVEPOSITION';
}

function postEdit(state: PuzzleState, cellIndex: number): PuzzleState;
function postEdit(state: BuilderState, cellIndex: number): BuilderState;
function postEdit<T extends GridInterfaceState>(state: T, cellIndex: number): T;
function postEdit(
  state: GridInterfaceState,
  cellIndex: number
): GridInterfaceState {
  if (isPuzzleState(state)) {
    return puzzlePostEdit(state, cellIndex);
  }
  if (isBuilderState(state)) {
    return builderPostEdit(state, cellIndex);
  }
  return state;
}

function enterText<T extends GridInterfaceState>(state: T, text: string): T {
  const symmetry = isBuilderState(state) ? state.symmetry : Symmetry.None;
  return enterCharAt(state, state.active, text, symmetry);
}

function enterCharAt<T extends GridInterfaceState>(
  state: T,
  pos: Position,
  char: string,
  symmetry: Symmetry
): T {
  const ci = cellIndex(state.grid, pos);
  if (state.isEditable(ci)) {
    if (isPuzzleState(state)) {
      const elapsed = getCurrentTime(state);
      state.cellsUpdatedAt[ci] = elapsed;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
      state.cellsIterationCount[ci]! += 1;
    }
    let grid = state.grid;
    if (char === BLOCK) {
      if (valAt(grid, pos) !== BLOCK && grid.allowBlockEditing) {
        grid = gridWithBlockToggled(grid, pos, symmetry, ToggleSetting.Toggle);
      }
    } else {
      grid = gridWithNewChar(grid, pos, char || EMPTY, symmetry);
    }
    state = clearSelection(state);
    state = postEdit({ ...state, grid }, ci);
  }
  return state;
}

export function closeRebus<T extends GridInterfaceState>(state: T): T {
  if (!state.isEnteringRebus) {
    return state;
  }
  state = enterText(state, state.rebusValue);
  return {
    ...state,
    isEnteringRebus: false,
    rebusValue: '',
  };
}

export function gridInterfaceReducer<T extends GridInterfaceState>(
  state: T,
  action: PuzzleAction
): T {
  if (action.type === 'CHANGEDIRECTION') {
    return {
      ...closeRebus(state),
      wasEntryClick: false,
      active: {
        ...state.active,
        dir: (state.active.dir + 1) % 2,
      },
    };
  }
  if (isClickedEntryAction(action)) {
    const clickedEntry = state.grid.entries[action.entryIndex];
    if (clickedEntry === undefined) {
      throw new Error('oob');
    }
    for (const cell of clickedEntry.cells) {
      if (valAt(state.grid, cell) === EMPTY) {
        return {
          ...closeRebus(state),
          wasEntryClick: true,
          active: { ...cell, dir: clickedEntry.direction },
        };
      }
    }
    state = closeRebus(state);
    state = clearSelection(state);
    return {
      ...state,
      wasEntryClick: true,
      active: { ...clickedEntry.cells[0], dir: clickedEntry.direction },
    };
  }
  if (isSetActivePositionAction(action)) {
    if (isBuilderState(state) && action.shiftKey) {
      return {
        ...state,
        selection: {
          start: { ...state.active },
          end: { ...action.newActive },
        },
      };
    }
    state = closeRebus(state);
    state = clearSelection(state);
    return {
      ...state,
      wasEntryClick: false,
      active: { ...action.newActive, dir: state.active.dir },
    };
  }
  if (isCopyAction(action) || isCutAction(action)) {
    if (state.isEnteringRebus) {
      return state;
    }
    let toCopy = '';
    if (isBuilderState(state) && hasSelection(state)) {
      const grid = state.grid;
      let row: number | null = null;
      forEachPosition(state.selection, (pos) => {
        if (row != null && row !== pos.row) {
          toCopy += ROW_DELIMITER;
        }
        row = pos.row;
        const val = valAt(grid, pos);
        toCopy += val + CELL_DELIMITER;
        if (isCutAction(action)) {
          state = enterCharAt(state, pos, EMPTY, Symmetry.None);
        }
      });
    } else {
      const val = valAt(state.grid, state.active);
      if (val !== BLOCK && val !== EMPTY) {
        toCopy = val;
        if (isCutAction(action)) {
          state = enterText(state, EMPTY);
        }
      }
    }
    navigator.clipboard.writeText(toCopy).catch((e: unknown) => {
      console.log('There was a problem copying to clipboard:', e);
    });
    return state;
  }
  if (isPasteAction(action)) {
    const toPaste = action.content.split(ROW_DELIMITER).map((r) =>
      r
        .split(CELL_DELIMITER)
        .filter((s) => s.length > 0)
        .map((s) =>
          s
            .split('')
            .filter((x) => x.match(ALLOWABLE_GRID_CHARS) !== null || x === BLOCK)
            .join('')
            .toUpperCase()
        )
    );
    if (toPaste.length === 0) {
      return state;
    }
    if (state.isEnteringRebus) {
      return {
        ...state,
        rebusValue: state.rebusValue + toPaste.flat().join(''),
      };
    }
    const start = state.active;
    const current = { ...start };
    toPaste.forEach((rowStrs, dRow) => {
      rowStrs.forEach((cellStr, dCol) => {
        current.row = start.row + dRow;
        current.col = start.col + dCol;
        if (isInBounds(state.grid, current)) {
          state = enterCharAt(state, current, cellStr, Symmetry.None);
        }
      });
    });
    state = {
      ...state,
      wasEntryClick: false,
      active: advancePosition(
        state.grid,
        clampInBounds(state.grid, current),
        isPuzzleState(state) ? state.wrongCells : new Set(),
        isPuzzleState(state) ? state.prefs : undefined
      ),
    };
    return state;
  }
  if (isKeypressAction(action)) {
    const key = action.key;
    // Resume on Esc, but only during midgame pause
    if (
      isPuzzleState(state) &&
      !state.success &&
      !state.currentTimeWindowStart &&
      state.bankedSeconds !== 0
    ) {
      if (key.k === KeyK.Escape) {
        return {
          ...state,
          currentTimeWindowStart: new Date().getTime(),
        };
      }
      return state;
    }
    if (key.k === KeyK.NumLayout || key.k === KeyK.AbcLayout) {
      return { ...state, showExtraKeyLayout: !state.showExtraKeyLayout };
    }
    if (state.isEnteringRebus) {
      if (key.k === KeyK.AllowedCharacter) {
        return { ...state, rebusValue: state.rebusValue + key.c.toUpperCase() };
      } else if (key.k === KeyK.Backspace || key.k === KeyK.OskBackspace) {
        return {
          ...state,
          rebusValue: state.rebusValue ? state.rebusValue.slice(0, -1) : '',
        };
      } else if (key.k === KeyK.Enter) {
        return {
          ...closeRebus(state),
          wasEntryClick: false,
          active: advancePosition(
            state.grid,
            state.active,
            isPuzzleState(state) ? state.wrongCells : new Set(),
            isPuzzleState(state) ? state.prefs : undefined
          ),
        };
      } else if (key.k === KeyK.Escape) {
        return { ...state, isEnteringRebus: false, rebusValue: '' };
      }
      return closeRebus(state);
    }
    if (key.k === KeyK.Rebus || key.k === KeyK.Escape) {
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        return { ...state, showExtraKeyLayout: false, isEnteringRebus: true };
      }
      return state;
    } else if (key.k === KeyK.Space || key.k === KeyK.Direction) {
      return {
        ...state,
        wasEntryClick: false,
        active: {
          ...state.active,
          dir: (state.active.dir + 1) % 2,
        },
      };
    } else if (key.k === KeyK.Prev) {
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: retreatPosition(state.grid, state.active),
      };
    } else if (key.k === KeyK.Next) {
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: nextCell(state.grid, state.active),
      };
    } else if (
      key.k === KeyK.Tab ||
      key.k === KeyK.NextEntry ||
      key.k === KeyK.Enter
    ) {
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: moveToNextEntry(state.grid, state.active),
      };
    } else if (
      key.k === KeyK.ShiftTab ||
      key.k === KeyK.PrevEntry ||
      key.k === KeyK.ShiftEnter
    ) {
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: moveToPrevEntry(state.grid, state.active),
      };
    } else if (key.k === KeyK.ArrowRight) {
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: {
          ...state.active,
          ...((state.active.dir === Direction.Across ||
            (isPuzzleState(state) && state.prefs?.advanceOnPerpendicular)) &&
            moveRight(state.grid, state.active)),
          dir: Direction.Across,
        },
      };
    } else if (key.k === KeyK.ArrowLeft) {
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: {
          ...state.active,
          ...((state.active.dir === Direction.Across ||
            (isPuzzleState(state) && state.prefs?.advanceOnPerpendicular)) &&
            moveLeft(state.grid, state.active)),
          dir: Direction.Across,
        },
      };
    } else if (key.k === KeyK.ArrowUp) {
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: {
          ...state.active,
          ...((state.active.dir === Direction.Down ||
            (isPuzzleState(state) && state.prefs?.advanceOnPerpendicular)) &&
            moveUp(state.grid, state.active)),
          dir: Direction.Down,
        },
      };
    } else if (key.k === KeyK.ArrowDown) {
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: {
          ...state.active,
          ...((state.active.dir === Direction.Down ||
            (isPuzzleState(state) && state.prefs?.advanceOnPerpendicular)) &&
            moveDown(state.grid, state.active)),
          dir: Direction.Down,
        },
      };
    } else if (key.k === KeyK.AllowedCharacter) {
      const char = key.c.toUpperCase();
      state = enterText(state, char);
      return {
        ...state,
        wasEntryClick: false,
        active: advancePosition(
          state.grid,
          state.active,
          isPuzzleState(state) ? state.wrongCells : new Set(),
          isPuzzleState(state) ? state.prefs : undefined
        ),
      };
    } else if (key.k === KeyK.Backspace || key.k === KeyK.OskBackspace) {
      const positions =
        isBuilderState(state) && hasSelection(state)
          ? getSelectionCells(state.selection)
          : [state.active];
      for (const position of positions) {
        const ci = cellIndex(state.grid, position);
        if (state.isEditable(ci)) {
          const symmetry = isBuilderState(state)
            ? state.symmetry
            : Symmetry.None;
          if (isPuzzleState(state)) {
            const elapsed = getCurrentTime(state);
            state.cellsUpdatedAt[ci] = elapsed;
          }
          const grid = gridWithNewChar(state.grid, position, EMPTY, symmetry);
          state = postEdit({ ...state, grid }, ci);
        }
      }
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: retreatPosition(state.grid, state.active),
      };
    } else if (key.k === KeyK.Delete) {
      const positions =
        isBuilderState(state) && hasSelection(state)
          ? getSelectionCells(state.selection)
          : [state.active];
      for (const position of positions) {
        const ci = cellIndex(state.grid, position);
        if (state.isEditable(ci)) {
          const symmetry = isBuilderState(state)
            ? state.symmetry
            : Symmetry.None;
          if (isPuzzleState(state)) {
            const elapsed = getCurrentTime(state);
            state.cellsUpdatedAt[ci] = elapsed;
          }
          const grid = gridWithNewChar(state.grid, position, EMPTY, symmetry);
          state = postEdit({ ...state, grid }, ci);
        }
      }
      state = clearSelection(state);
      return {
        ...state,
        wasEntryClick: false,
        active: nextCell(state.grid, state.active),
      };
    }
  }
  return state;
}

function getCurrentTime(state: PuzzleState) {
  if (state.currentTimeWindowStart === 0) {
    return state.bankedSeconds;
  }
  return (
    state.bankedSeconds +
    (new Date().getTime() - state.currentTimeWindowStart) / 1000
  );
}
