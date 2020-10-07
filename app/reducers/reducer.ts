import { toast } from 'react-toastify';

import { PosAndDir, Position, Direction, BLOCK } from '../lib/types';
import { DBPuzzleT, PlayWithoutUserT } from '../lib/dbtypes';
import {
  ViewableGrid, ViewableEntry, CluedGrid,
  gridWithNewChar, gridWithBlockToggled, advancePosition, retreatPosition,
  moveToNextEntry, moveToPrevEntry, moveUp, moveDown, moveLeft, moveRight,
  nextNonBlock, nextCell, fromCells
} from '../lib/viewableGrid';
import { cellIndex, valAt, entryAtPosition, entryWord, gridWithEntrySet } from '../lib/gridBase';
import type firebase from 'firebase';
import { App, TimestampType } from '../lib/firebaseWrapper';

interface GridInterfaceState {
  type: string,
  active: PosAndDir,
  grid: ViewableGrid<ViewableEntry>,
  showExtraKeyLayout: boolean,
  isEnteringRebus: boolean,
  rebusValue: string,
  isEditable(cellIndex: number): boolean,
  postEdit(cellIndex: number): GridInterfaceState,
}

interface PuzzleState extends GridInterfaceState {
  type: 'puzzle',
  grid: CluedGrid,
  answers: Array<string>,
  verifiedCells: Set<number>,
  revealedCells: Set<number>,
  wrongCells: Set<number>,
  success: boolean,
  ranSuccessEffects: boolean,
  filled: boolean,
  autocheck: boolean,
  dismissedKeepTrying: boolean,
  dismissedSuccess: boolean,
  moderating: boolean,
  didCheat: boolean,
  clueView: boolean,
  cellsUpdatedAt: Array<number>,
  cellsIterationCount: Array<number>,
  cellsEverMarkedWrong: Set<number>,
  displaySeconds: number,
  bankedSeconds: number,
  currentTimeWindowStart: number,
  loadedPlayState: boolean,
  waitToResize: boolean,
}
function isPuzzleState(state: GridInterfaceState): state is PuzzleState {
  return state.type === 'puzzle';
}

export type BuilderEntry = ViewableEntry;
export type BuilderGrid = ViewableGrid<BuilderEntry>;

export interface BuilderState extends GridInterfaceState {
  id: string,
  type: 'builder',
  title: string | null,
  notes: string | null,
  blogPost: string | null,
  grid: BuilderGrid,
  gridIsComplete: boolean,
  repeats: Set<string>,
  hasNoShortWords: boolean,
  clues: Record<string, string>,
  symmetry: Symmetry,
  publishErrors: Array<string>,
  toPublish: DBPuzzleT | null,
  authorId: string,
  authorName: string,
  isPrivate: boolean,
  isPrivateUntil: TimestampType | null
}
function isBuilderState(state: GridInterfaceState): state is BuilderState {
  return state.type === 'builder';
}

export function initialBuilderState(
  { id, width, height, grid, highlighted, highlight, title, notes, clues, authorId, authorName, editable }:
    {
      id: string | null,
      width: number,
      height: number,
      grid: Array<string>,
      highlighted: Array<number>,
      highlight: 'circle' | 'shade',
      title: string | null,
      notes: string | null,
      clues: Record<string, string>,
      authorId: string,
      authorName: string,
      editable: boolean,
    }) {
  const initialGrid = fromCells({
    mapper: (e) => e,
    width: width,
    height: height,
    cells: grid,
    allowBlockEditing: true,
    highlighted: new Set(highlighted),
    highlight: highlight
  });
  return validateGrid({
    id: id || App.firestore().collection('c').doc().id,
    type: 'builder',
    title: title,
    notes: notes,
    blogPost: null,
    active: { col: 0, row: 0, dir: Direction.Across },
    grid: initialGrid,
    showExtraKeyLayout: false,
    isEnteringRebus: false,
    rebusValue: '',
    gridIsComplete: false,
    repeats: new Set<string>(),
    hasNoShortWords: false,
    isEditable: () => editable,
    symmetry: (width === 5 && height === 5) ? Symmetry.None : Symmetry.Rotational,
    clues: clues,
    publishErrors: [],
    toPublish: null,
    authorId: authorId,
    authorName: authorName,
    isPrivate: false,
    isPrivateUntil: null,
    postEdit(_cellIndex) {
      return validateGrid(this);
    }
  });
}

export interface PuzzleAction {
  type: string,
}

export interface KeypressAction extends PuzzleAction {
  type: 'KEYPRESS',
  key: string,
  shift: boolean,
}
function isKeypressAction(action: PuzzleAction): action is KeypressAction {
  return action.type === 'KEYPRESS';
}

export interface SymmetryAction extends PuzzleAction {
  type: 'CHANGESYMMETRY',
  symmetry: Symmetry,
}
export function isSymmetryAction(action: PuzzleAction): action is SymmetryAction {
  return action.type === 'CHANGESYMMETRY';
}

export interface SetClueAction extends PuzzleAction {
  type: 'SETCLUE',
  word: string,
  clue: string,
}
function isSetClueAction(action: PuzzleAction): action is SetClueAction {
  return action.type === 'SETCLUE';
}

export interface SetTitleAction extends PuzzleAction {
  type: 'SETTITLE',
  value: string,
}
function isSetTitleAction(action: PuzzleAction): action is SetTitleAction {
  return action.type === 'SETTITLE';
}

export interface SetPrivateAction extends PuzzleAction {
  type: 'SETPRIVATE',
  value: boolean | TimestampType,
}
function isSetPrivateAction(action: PuzzleAction): action is SetPrivateAction {
  return action.type === 'SETPRIVATE';
}

export interface SetBlogPostAction extends PuzzleAction {
  type: 'SETBLOGPOST',
  value: string | null,
}
function isSetBlogPostAction(action: PuzzleAction): action is SetBlogPostAction {
  return action.type === 'SETBLOGPOST';
}

export interface SetNotesAction extends PuzzleAction {
  type: 'SETNOTES',
  value: string | null,
}
function isSetNotesAction(action: PuzzleAction): action is SetNotesAction {
  return action.type === 'SETNOTES';
}

export interface SetHighlightAction extends PuzzleAction {
  type: 'SETHIGHLIGHT',
  highlight: 'circle' | 'shade',
}
function isSetHighlightAction(action: PuzzleAction): action is SetHighlightAction {
  return action.type === 'SETHIGHLIGHT';
}

export interface ClickedFillAction extends PuzzleAction {
  type: 'CLICKEDFILL',
  entryIndex: number,
  value: string,
}
export function isClickedFillAction(action: PuzzleAction): action is ClickedFillAction {
  return action.type === 'CLICKEDFILL';
}

export interface PublishAction extends PuzzleAction {
  type: 'PUBLISH',
  publishTimestamp: firebase.firestore.Timestamp
}
export function isPublishAction(action: PuzzleAction): action is PublishAction {
  return action.type === 'PUBLISH';
}

export interface CancelPublishAction extends PuzzleAction {
  type: 'CANCELPUBLISH',
}
export function isCancelPublishAction(action: PuzzleAction): action is CancelPublishAction {
  return action.type === 'CANCELPUBLISH';
}

export interface NewPuzzleAction extends PuzzleAction {
  type: 'NEWPUZZLE',
  rows: number,
  cols: number
}
export function isNewPuzzleAction(action: PuzzleAction): action is NewPuzzleAction {
  return action.type === 'NEWPUZZLE';
}

interface SetActiveAction extends PuzzleAction {
  type: 'SETACTIVE',
  newActive: PosAndDir,
}
function isSetActiveAction(action: PuzzleAction): action is SetActiveAction {
  return action.type === 'SETACTIVE';
}

export interface ClickedEntryAction extends PuzzleAction {
  type: 'CLICKEDENTRY',
  entryIndex: number,
}
function isClickedEntryAction(action: PuzzleAction): action is ClickedEntryAction {
  return action.type === 'CLICKEDENTRY';
}

export interface SetActivePositionAction extends PuzzleAction {
  type: 'SETACTIVEPOSITION',
  newActive: Position,
}
function isSetActivePositionAction(action: PuzzleAction): action is SetActivePositionAction {
  return action.type === 'SETACTIVEPOSITION';
}

export enum Symmetry {
  Rotational,
  Horizontal,
  Vertical,
  None,
  DiagonalNESW,
  DiagonalNWSE,
}

export enum CheatUnit {
  Square,
  Entry,
  Puzzle
}
export interface CheatAction extends PuzzleAction {
  type: 'CHEAT',
  unit: CheatUnit,
  isReveal?: boolean,
}
function isCheatAction(action: PuzzleAction): action is CheatAction {
  return action.type === 'CHEAT';
}

export interface ToggleAutocheckAction extends PuzzleAction {
  type: 'TOGGLEAUTOCHECK',
}
function isToggleAutocheckAction(action: PuzzleAction): action is ToggleAutocheckAction {
  return action.type === 'TOGGLEAUTOCHECK';
}

export interface ToggleClueViewAction extends PuzzleAction {
  type: 'TOGGLECLUEVIEW',
}
function isToggleClueViewAction(action: PuzzleAction): action is ToggleClueViewAction {
  return action.type === 'TOGGLECLUEVIEW';
}

export interface RanSuccessEffectsAction extends PuzzleAction {
  type: 'RANSUCCESS',
}
function isRanSuccessEffectsAction(action: PuzzleAction): action is RanSuccessEffectsAction {
  return action.type === 'RANSUCCESS';
}

export interface LoadPlayAction extends PuzzleAction {
  type: 'LOADPLAY',
  play: PlayWithoutUserT | null,
  isAuthor: boolean,
}
function isLoadPlayAction(action: PuzzleAction): action is LoadPlayAction {
  return action.type === 'LOADPLAY';
}

function cheatCells(elapsed: number, state: PuzzleState, cellsToCheck: Array<Position>, isReveal: boolean) {
  const revealedCells = new Set(state.revealedCells);
  const verifiedCells = new Set(state.verifiedCells);
  const wrongCells = new Set(state.wrongCells);
  let grid = state.grid;

  for (const cell of cellsToCheck) {
    const ci = cellIndex(state.grid, cell);
    const shouldBe = state.answers[ci];
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
  return (checkComplete({ ...state, grid, wrongCells, revealedCells, verifiedCells }));
}

export function cheat(state: PuzzleState, cheatUnit: CheatUnit, isReveal: boolean) {
  const elapsed = getCurrentTime(state);
  let cellsToCheck: Array<Position> = [];
  if (cheatUnit === CheatUnit.Square) {
    cellsToCheck = [state.active];
  } else if (cheatUnit === CheatUnit.Entry) {
    const entry = entryAtPosition(state.grid, state.active)[0];
    if (!entry) { //block?
      return state;
    }
    cellsToCheck = entry.cells;
  } else if (cheatUnit === CheatUnit.Puzzle) {
    for (let rowidx = 0; rowidx < state.grid.height; rowidx += 1) {
      for (let colidx = 0; colidx < state.grid.width; colidx += 1) {
        cellsToCheck.push({ 'row': rowidx, 'col': colidx });
      }
    }
  }
  const newState = cheatCells(elapsed, state, cellsToCheck, isReveal);
  return { ...newState, didCheat: true };
}

export function checkComplete(state: PuzzleState) {
  let filled = true;
  let success = true;
  for (let i = 0; i < state.grid.cells.length; i += 1) {
    if (state.grid.cells[i].trim() === '') {
      filled = false;
      success = false;
      break;
    }
    if (state.answers && state.grid.cells[i] !== state.answers[i]) {
      success = false;
    }
  }
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
    return { ...state, filled, success, bankedSeconds, currentTimeWindowStart, dismissedKeepTrying };
  }
  return state;
}

export function gridInterfaceReducer<T extends GridInterfaceState>(state: T, action: PuzzleAction): T {
  if (action.type === 'CHANGEDIRECTION') {
    return ({ ...state, active: { ...state.active, dir: (state.active.dir + 1) % 2 } });
  }
  if (isClickedEntryAction(action)) {
    const clickedEntry = state.grid.entries[action.entryIndex];
    for (const cell of clickedEntry.cells) {
      if (valAt(state.grid, cell) === ' ') {
        return ({ ...state, active: { ...cell, dir: clickedEntry.direction } });
      }
    }
    return ({ ...state, active: { ...clickedEntry.cells[0], dir: clickedEntry.direction } });
  }
  if (isSetActiveAction(action)) {
    return ({ ...state, active: action.newActive });
  }
  if (isSetActivePositionAction(action)) {
    return ({ ...state, active: { ...action.newActive, dir: state.active.dir } });
  }
  if (isKeypressAction(action)) {
    const key = action.key;
    const shift = action.shift;
    if (!key) {
      // This seems dumb to check for but at least once we've had key == undefined here
      // https://sentry.io/organizations/m-d/issues/1915351332/
      return state;
    }
    if (key === '$') {
      toast('🔥 This is an example pop up notification! 🔥');
      return state;
    }
    if (key === '{num}' || key === '{abc}') {
      return ({ ...state, showExtraKeyLayout: !state.showExtraKeyLayout });
    }
    if (key === '`' && isBuilderState(state)) {
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        if (state.grid.highlighted.has(ci)) {
          state.grid.highlighted.delete(ci);
        } else {
          state.grid.highlighted.add(ci);
        }
      }
      return { ...state };
    }
    if (state.isEnteringRebus) {
      if (key.match(/^[A-Za-z0-9]$/)) {
        return ({ ...state, rebusValue: state.rebusValue + key.toUpperCase() });
      } else if (key === 'Backspace' || key === '{bksp}') {
        return ({ ...state, rebusValue: state.rebusValue ? state.rebusValue.slice(0, -1) : '' });
      } else if (key === 'Enter') {
        const ci = cellIndex(state.grid, state.active);
        if (state.isEditable(ci)) {
          if (isPuzzleState(state)) {
            const elapsed = getCurrentTime(state);
            state.cellsUpdatedAt[ci] = elapsed;
            state.cellsIterationCount[ci] += 1;
          }
          const symmetry = isBuilderState(state) ? state.symmetry : Symmetry.None;
          state.grid = gridWithNewChar(state.grid, state.active, state.rebusValue || ' ', symmetry);
          state = state.postEdit(ci) as T; // TODO this is trash
        }
        return ({
          ...state,
          active: advancePosition(state.grid, state.active, isPuzzleState(state) ? state.wrongCells : new Set()),
          isEnteringRebus: false, rebusValue: ''
        });
      } else if (key === 'Escape') {
        return ({ ...state, isEnteringRebus: false, rebusValue: '' });
      }
      return state;
    }
    if (key === '{rebus}' || key === 'Escape') {
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        return ({ ...state, showExtraKeyLayout: false, isEnteringRebus: true });
      }
      return state;
    } else if (key === ' ' || key === '{dir}') {
      return ({ ...state, active: { ...state.active, dir: (state.active.dir + 1) % 2 } });
    } else if (key === '{prev}') {
      return ({ ...state, active: retreatPosition(state.grid, state.active) });
    } else if (key === '{next}') {
      return ({ ...state, active: nextCell(state.grid, state.active) });
    } else if ((key === 'Tab' && !shift) || key === '{nextEntry}' || key === 'Enter') {
      return ({ ...state, active: moveToNextEntry(state.grid, state.active) });
    } else if ((key === 'Tab' && shift) || key === '{prevEntry}') {
      return ({ ...state, active: moveToPrevEntry(state.grid, state.active) });
    } else if (key === 'ArrowRight') {
      return ({ ...state, active: { ...moveRight(state.grid, state.active), dir: Direction.Across } });
    } else if (key === 'ArrowLeft') {
      return ({ ...state, active: { ...moveLeft(state.grid, state.active), dir: Direction.Across } });
    } else if (key === 'ArrowUp') {
      return ({ ...state, active: { ...moveUp(state.grid, state.active), dir: Direction.Down } });
    } else if (key === 'ArrowDown') {
      return ({ ...state, active: { ...moveDown(state.grid, state.active), dir: Direction.Down } });
    } else if ((key === '.' || key === '{block}') && state.grid.allowBlockEditing) {
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        const symmetry = isBuilderState(state) ? state.symmetry : Symmetry.None;
        state.grid = gridWithBlockToggled(state.grid, state.active, symmetry);
        return { ...state.postEdit(ci) as T, active: nextCell(state.grid, state.active) }; // TODO postEdit typecast this is trash
      }
      return state;
    } else if (key.match(/^[A-Za-z0-9]$/)) {
      const char = key.toUpperCase();
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        const symmetry = isBuilderState(state) ? state.symmetry : Symmetry.None;
        if (isPuzzleState(state)) {
          const elapsed = getCurrentTime(state);
          state.cellsUpdatedAt[ci] = elapsed;
          state.cellsIterationCount[ci] += 1;
        }
        state.grid = gridWithNewChar(state.grid, state.active, char, symmetry);
        state = state.postEdit(ci) as T; // TODO this is trash
      }
      return ({
        ...state,
        active: advancePosition(state.grid, state.active, isPuzzleState(state) ? state.wrongCells : new Set()),
      });
    } else if (key === 'Backspace' || key === '{bksp}') {
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        const symmetry = isBuilderState(state) ? state.symmetry : Symmetry.None;
        if (isPuzzleState(state)) {
          const elapsed = getCurrentTime(state);
          state.cellsUpdatedAt[ci] = elapsed;
        }
        state.grid = gridWithNewChar(state.grid, state.active, ' ', symmetry);
        state = state.postEdit(ci) as T; // TODO this is trash
      }
      return ({
        ...state,
        active: retreatPosition(state.grid, state.active),
      });
    }
  }
  return state;
}

export function builderReducer(state: BuilderState, action: PuzzleAction): BuilderState {
  state = gridInterfaceReducer(state, action);
  if (isSymmetryAction(action)) {
    if ((action.symmetry === Symmetry.DiagonalNESW || action.symmetry === Symmetry.DiagonalNWSE)
      && (state.grid.width !== state.grid.height)) {
      // Don't allow diagonal symmetry for rectangles
      return state;
    }
    return ({ ...state, symmetry: action.symmetry });
  }
  if (isSetHighlightAction(action)) {
    state.grid.highlight = action.highlight;
    return ({ ...state });
  }
  if (isSetClueAction(action)) {
    return ({ ...state, clues: { ...state.clues, [action.word]: action.clue } });
  }
  if (isSetTitleAction(action)) {
    return ({ ...state, title: action.value });
  }
  if (isSetPrivateAction(action)) {
    if (typeof action.value === 'boolean') {
      return ({ ...state, isPrivate: action.value, isPrivateUntil: null });
    }
    return ({ ...state, isPrivate: false, isPrivateUntil: action.value });
  }
  if (isSetBlogPostAction(action)) {
    return ({ ...state, blogPost: action.value });
  }
  if (isSetNotesAction(action)) {
    return ({ ...state, notes: action.value });
  }
  if (isClickedFillAction(action)) {
    return ({ ...state, grid: gridWithEntrySet(state.grid, action.entryIndex, action.value) }.postEdit(0) as BuilderState);
  }
  if (action.type === 'CLEARPUBLISHERRORS') {
    return ({ ...state, publishErrors: [] });
  }
  if (isNewPuzzleAction(action)) {
    return initialBuilderState({
      id: null,
      width: action.cols, height: action.rows,
      grid: Array(action.cols * action.rows).fill(' '),
      title: null,
      notes: null,
      highlight: 'circle',
      highlighted: [],
      clues: {},
      authorId: state.authorId,
      authorName: state.authorName,
      editable: true,
    });
  }
  if (isPublishAction(action)) {
    const errors = [];
    if (!state.gridIsComplete) {
      errors.push('All squares in the grid must be filled in');
    }
    if (state.repeats.size > 0) {
      errors.push('No words can be repeated (' + Array.from(state.repeats).sort().join(', ') + ')');
    }
    if (!state.title) {
      errors.push('Puzzle must have a title set');
    }
    const missingClues = state.grid.entries.filter((e) => e.completedWord && !state.clues[e.completedWord]).map((e => e.completedWord || ''));
    if (missingClues.length) {
      errors.push('Some words are missing clues: ' + Array.from(new Set(missingClues)).sort().join(', '));
    }

    if (errors.length) {
      return { ...state, publishErrors: errors };
    }

    const ac: Array<string> = [];
    const an: Array<number> = [];
    const dc: Array<string> = [];
    const dn: Array<number> = [];
    state.grid.entries.forEach((e) => {
      if (!e.completedWord) {
        throw new Error('Publish unfinished grid');
      }
      const clue = state.clues[e.completedWord];
      if (!clue) {
        throw new Error('Bad clue for ' + e.completedWord);
      }
      if (e.direction === Direction.Across) {
        ac.push(clue);
        an.push(e.labelNumber);
      } else {
        dc.push(clue);
        dn.push(e.labelNumber);
      }
    });
    const puzzle: DBPuzzleT = {
      t: state.title || 'Anonymous',
      a: state.authorId,
      n: state.authorName,
      m: false,
      p: action.publishTimestamp,
      c: null,
      h: state.grid.height,
      w: state.grid.width,
      g: state.grid.cells,
      ac, an, dc, dn,
      ...state.notes && { cn: state.notes }
    };
    if (state.grid.highlighted.size) {
      puzzle.hs = Array.from(state.grid.highlighted);
      if (state.grid.highlight === 'shade') {
        puzzle.s = true;
      }
    }
    return { ...state, toPublish: puzzle };
  }
  if (isCancelPublishAction(action)) {
    return { ...state, toPublish: null };
  }
  return state;
}

function getCurrentTime(state: PuzzleState) {
  if (state.currentTimeWindowStart === 0) {
    return state.bankedSeconds;
  }
  return state.bankedSeconds + ((new Date()).getTime() - state.currentTimeWindowStart) / 1000;
}

export function puzzleReducer(state: PuzzleState, action: PuzzleAction): PuzzleState {
  state = gridInterfaceReducer(state, action);
  if (isCheatAction(action)) {
    return cheat(state, action.unit, action.isReveal === true);
  }
  if (isRanSuccessEffectsAction(action)) {
    return { ...state, ranSuccessEffects: true };
  }
  if (isLoadPlayAction(action)) {
    if (action.isAuthor) {
      return { ...state, success: true, ranSuccessEffects: true, grid: { ...state.grid, cells: state.answers } };
    }
    const play = action.play;
    if (play === null) {
      return { ...state, loadedPlayState: true };
    }
    return {
      ...state,
      loadedPlayState: true,
      grid: { ...state.grid, cells: play.g },
      verifiedCells: new Set<number>(play.vc),
      wrongCells: new Set<number>(play.wc),
      revealedCells: new Set<number>(play.rc),
      success: play.f,
      ranSuccessEffects: play.f,
      displaySeconds: play.t,
      bankedSeconds: play.t,
      didCheat: play.ch,
      cellsUpdatedAt: play.ct,
      cellsIterationCount: play.uc,
      cellsEverMarkedWrong: new Set<number>(play.we)
    };
  }
  if (isToggleClueViewAction(action)) {
    return { ...state, clueView: !state.clueView };
  }
  if (isToggleAutocheckAction(action)) {
    state = cheat(state, CheatUnit.Puzzle, false);
    return { ...state, autocheck: !state.autocheck };
  }
  if (action.type === 'RESUMEACTION') {
    if (state.currentTimeWindowStart !== 0) {
      return state;
    }
    return { ...state, waitToResize: false, currentTimeWindowStart: (new Date()).getTime() };
  }
  if (action.type === 'PAUSEACTION') {
    if (state.currentTimeWindowStart === 0) {
      return state;
    }
    return { ...state, bankedSeconds: getCurrentTime(state), currentTimeWindowStart: 0 };
  }
  if (action.type === 'TICKACTION') {
    return { ...state, displaySeconds: getCurrentTime(state) };
  }
  if (action.type === 'DISMISSKEEPTRYING') {
    const currentTimeWindowStart = state.currentTimeWindowStart || (new Date()).getTime();
    return { ...state, waitToResize: false, currentTimeWindowStart, dismissedKeepTrying: true };
  }
  if (action.type === 'DISMISSSUCCESS') {
    return { ...state, waitToResize: false, dismissedSuccess: true };
  }
  if (action.type === 'UNDISMISSSUCCESS') {
    return { ...state, dismissedSuccess: false };
  }
  if (action.type === 'TOGGLEMODERATING') {
    return { ...state, moderating: !state.moderating };
  }
  return state;
}

export function validateGrid(state: BuilderState) {
  let gridIsComplete = true;
  const repeats = new Set<string>();
  let hasNoShortWords = true;

  for (let i = 0; i < state.grid.cells.length; i += 1) {
    if (state.grid.cells[i].trim() === '') {
      gridIsComplete = false;
      break;
    }
  }

  for (let i = 0; i < state.grid.entries.length; i += 1) {
    if (state.grid.entries[i].cells.length <= 2) {
      hasNoShortWords = false;
    }
    for (let j = 0; j < state.grid.entries.length; j += 1) {
      if (state.grid.entries[i].completedWord === null) continue;
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
    hasNoShortWords
  };
}

export function advanceActiveToNonBlock(state: PuzzleState) {
  return { ...state, active: { ...nextNonBlock(state.grid, state.active), dir: Direction.Across } };
}
