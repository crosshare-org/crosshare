import {
  PosAndDir,
  Position,
  Direction,
  BLOCK,
  PuzzleInProgressT,
  Key,
  KeyK,
  ALLOWABLE_GRID_CHARS,
  Symmetry,
  PrefillSquares,
  CheatUnit,
  EMPTY,
  CELL_DELIMITER,
  ROW_DELIMITER,
} from '../lib/types';
import { DBPuzzleT, PlayWithoutUserT } from '../lib/dbtypes';
import {
  ViewableGrid,
  ViewableEntry,
  CluedGrid,
  gridWithNewChar,
  gridWithBlockToggled,
  advancePosition,
  retreatPosition,
  moveToNextEntry,
  moveToPrevEntry,
  moveUp,
  moveDown,
  moveLeft,
  moveRight,
  nextNonBlock,
  nextCell,
  fromCells,
  gridWithBarToggled,
  gridWithHiddenToggled,
} from '../lib/viewableGrid';
import {
  cellIndex,
  valAt,
  entryAtPosition,
  entryWord,
  gridWithEntrySet,
  isInBounds,
  clampInBounds,
} from '../lib/gridBase';
import { Timestamp } from '../lib/timestamp';
import { AccountPrefsFlagsT } from '../lib/prefs';
import { checkGrid } from '../lib/utils';
import equal from 'fast-deep-equal';
import { getDocId } from '../lib/firebaseWrapper';
import {
  GridSelection,
  emptySelection,
  forEachPosition,
  getSelectionCells,
  hasMultipleCells,
} from '../lib/selection';

interface GridInterfaceState {
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

interface PuzzleState extends GridInterfaceState {
  type: 'puzzle';
  grid: CluedGrid;
  prefs?: AccountPrefsFlagsT;
  answers: string[];
  alternateSolutions: [number, string][][];
  verifiedCells: Set<number>;
  revealedCells: Set<number>;
  wrongCells: Set<number>;
  success: boolean;
  ranSuccessEffects: boolean;
  ranMetaSubmitEffects: boolean;
  filled: boolean;
  autocheck: boolean;
  dismissedKeepTrying: boolean;
  dismissedSuccess: boolean;
  moderating: boolean;
  showingEmbedOverlay: boolean;
  didCheat: boolean;
  clueView: boolean;
  cellsUpdatedAt: number[];
  cellsIterationCount: number[];
  cellsEverMarkedWrong: Set<number>;
  displaySeconds: number;
  bankedSeconds: number;
  currentTimeWindowStart: number;
  loadedPlayState: boolean;
  contestSubmission?: string;
  contestPriorSubmissions?: string[];
  contestRevealed?: boolean;
  contestSubmitTime?: number;
  contestDisplayName?: string;
  contestEmail?: string;
}
function isPuzzleState(state: GridInterfaceState): state is PuzzleState {
  return state.type === 'puzzle';
}

export type BuilderEntry = ViewableEntry;
export type BuilderGrid = ViewableGrid<BuilderEntry>;

export interface BuilderState extends GridInterfaceState {
  id: string;
  type: 'builder';
  title: string | null;
  notes: string | null;
  guestConstructor: string | null;
  commentsDisabled?: boolean;
  blogPost: string | null;
  grid: BuilderGrid;
  gridIsComplete: boolean;
  repeats: Set<string>;
  hasNoShortWords: boolean;
  clues: Record<string, string[]>;
  symmetry: Symmetry;
  selection: GridSelection;
  publishErrors: string[];
  publishWarnings: string[];
  toPublish: DBPuzzleT | null;
  authorId: string;
  authorName: string;
  isPrivate: boolean;
  isPrivateUntil: Timestamp | null;
  isContestPuzzle: boolean;
  contestAnswers: string[] | null;
  contestHasPrize: boolean;
  contestRevealDelay: number | null;
  showDownloadLink: boolean;
  alternates: Record<number, string>[];
  userTags: string[];
}
function isBuilderState(state: GridInterfaceState): state is BuilderState {
  return state.type === 'builder';
}

function initialBuilderStateFromSaved(
  saved: PuzzleInProgressT | null,
  state: BuilderState
) {
  return initialBuilderState({
    id: saved?.id ?? null,
    width: saved?.width ?? state.grid.width,
    height: saved?.height ?? state.grid.height,
    grid: saved?.grid ?? state.grid.cells,
    vBars: saved?.vBars ?? Array.from(state.grid.vBars.values()),
    hBars: saved?.hBars ?? Array.from(state.grid.hBars.values()),
    highlighted:
      saved?.highlighted ?? Array.from(state.grid.highlighted.values()),
    highlight: saved?.highlight ?? state.grid.highlight,
    hidden: saved?.hidden ?? Array.from(state.grid.hidden),
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    title: saved?.title || state.title,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    notes: saved?.notes || state.notes,
    clues: saved?.clues ?? {},
    authorId: state.authorId,
    authorName: state.authorName,
    editable: true,
    isPrivate: saved?.isPrivate ?? false,
    isPrivateUntil: saved?.isPrivateUntil ?? null,
    blogPost: saved?.blogPost ?? null,
    guestConstructor: saved?.guestConstructor ?? null,
    commentsDisabled: saved?.commentsDisabled,
    contestAnswers: saved?.contestAnswers ?? null,
    contestHasPrize: saved?.contestHasPrize ?? false,
    contestRevealDelay: saved?.contestRevealDelay ?? null,
    alternates: saved?.alternates ?? null,
    userTags: saved?.userTags ?? [],
    symmetry: saved?.symmetry,
  });
}

export function initialBuilderState({
  id,
  width,
  height,
  grid,
  vBars,
  hBars,
  hidden,
  highlighted,
  highlight,
  title,
  notes,
  clues,
  authorId,
  authorName,
  editable,
  isPrivate,
  isPrivateUntil,
  blogPost,
  guestConstructor,
  commentsDisabled,
  contestAnswers,
  contestHasPrize,
  contestRevealDelay,
  alternates,
  userTags,
  symmetry,
}: {
  id: string | null;
  width: number;
  height: number;
  grid: string[];
  vBars: number[];
  hBars: number[];
  hidden: number[];
  highlighted: number[];
  highlight: 'circle' | 'shade';
  blogPost: string | null;
  guestConstructor: string | null;
  commentsDisabled?: boolean;
  title: string | null;
  notes: string | null;
  clues: Record<string, string> | Record<string, string[]>;
  authorId: string;
  authorName: string;
  editable: boolean;
  isPrivate: boolean;
  isPrivateUntil: number | null;
  contestAnswers: string[] | null;
  contestHasPrize: boolean;
  contestRevealDelay: number | null;
  alternates: Record<number, string>[] | null;
  userTags: string[];
  symmetry?: Symmetry;
}) {
  const initialGrid = fromCells({
    mapper: (e) => e,
    width: width,
    height: height,
    cells: grid,
    allowBlockEditing: true,
    highlighted: new Set(highlighted),
    highlight: highlight,
    vBars: new Set(vBars),
    hBars: new Set(hBars),
    hidden: new Set(hidden),
  });
  return validateGrid({
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    id: id || getDocId('c'),
    type: 'builder',
    title,
    notes,
    blogPost,
    guestConstructor,
    commentsDisabled,
    wasEntryClick: false,
    active: { col: 0, row: 0, dir: Direction.Across },
    grid: initialGrid,
    showExtraKeyLayout: false,
    isEnteringRebus: false,
    rebusValue: '',
    gridIsComplete: false,
    repeats: new Set<string>(),
    hasNoShortWords: false,
    isEditable() {
      return !this.alternates.length && editable;
    },
    symmetry:
      symmetry ?? (width * height < 49 ? Symmetry.None : Symmetry.Rotational),
    clues: Object.fromEntries(
      Object.entries(clues).map(([word, val]) =>
        typeof val === 'string' ? [word, [val]] : [word, val]
      )
    ),
    selection: emptySelection(),
    publishErrors: [],
    publishWarnings: [],
    toPublish: null,
    authorId,
    authorName,
    isPrivate,
    isPrivateUntil:
      isPrivateUntil !== null ? Timestamp.fromMillis(isPrivateUntil) : null,
    isContestPuzzle: contestAnswers ? contestAnswers.length > 0 : false,
    contestAnswers,
    contestHasPrize,
    contestRevealDelay,
    showDownloadLink: false,
    downsOnly: false,
    alternates: alternates ?? [],
    userTags,
  });
}

export interface PuzzleAction {
  type: string;
}

export interface KeypressAction extends PuzzleAction {
  type: 'KEYPRESS';
  key: Key;
}
function isKeypressAction(action: PuzzleAction): action is KeypressAction {
  return action.type === 'KEYPRESS';
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

export interface SymmetryAction extends PuzzleAction {
  type: 'CHANGESYMMETRY';
  symmetry: Symmetry;
}
export function isSymmetryAction(
  action: PuzzleAction
): action is SymmetryAction {
  return action.type === 'CHANGESYMMETRY';
}

export interface SetClueAction extends PuzzleAction {
  type: 'SETCLUE';
  word: string;
  clue: string;
  idx: number;
}
function isSetClueAction(action: PuzzleAction): action is SetClueAction {
  return action.type === 'SETCLUE';
}

export interface SetTitleAction extends PuzzleAction {
  type: 'SETTITLE';
  value: string;
}
function isSetTitleAction(action: PuzzleAction): action is SetTitleAction {
  return action.type === 'SETTITLE';
}

export interface SetPrivateAction extends PuzzleAction {
  type: 'SETPRIVATE';
  value: boolean | Timestamp;
}
function isSetPrivateAction(action: PuzzleAction): action is SetPrivateAction {
  return action.type === 'SETPRIVATE';
}

export interface SetBlogPostAction extends PuzzleAction {
  type: 'SETBLOGPOST';
  value: string | null;
}
function isSetBlogPostAction(
  action: PuzzleAction
): action is SetBlogPostAction {
  return action.type === 'SETBLOGPOST';
}

export interface SetNotesAction extends PuzzleAction {
  type: 'SETNOTES';
  value: string | null;
}
function isSetNotesAction(action: PuzzleAction): action is SetNotesAction {
  return action.type === 'SETNOTES';
}

export interface SetShowDownloadLink extends PuzzleAction {
  type: 'SETSHOWDOWNLOAD';
  value: boolean;
}
function isSetShowDownloadLink(
  action: PuzzleAction
): action is SetShowDownloadLink {
  return action.type === 'SETSHOWDOWNLOAD';
}

export interface SetGuestConstructorAction extends PuzzleAction {
  type: 'SETGC';
  value: string | null;
}
function isSetGuestConstructorAction(
  action: PuzzleAction
): action is SetGuestConstructorAction {
  return action.type === 'SETGC';
}

export interface SetCommentsDisabledAction extends PuzzleAction {
  type: 'SETCD';
  value: boolean;
}
function isSetCommentsDisabledAction(
  action: PuzzleAction
): action is SetCommentsDisabledAction {
  return action.type === 'SETCD';
}

export interface UpdateContestAction extends PuzzleAction {
  type: 'CONTEST';
  enabled?: boolean;
  addAnswer?: string;
  removeAnswer?: string;
  hasPrize?: boolean;
  revealDelay?: number | null;
}
function isUpdateContestAction(
  action: PuzzleAction
): action is UpdateContestAction {
  return action.type === 'CONTEST';
}

export interface SetTagsAction extends PuzzleAction {
  type: 'SETTAGS';
  tags: string[];
}
function isSetTagsAction(action: PuzzleAction): action is SetTagsAction {
  return action.type === 'SETTAGS';
}

export interface AddAlternateAction extends PuzzleAction {
  type: 'ADDALT';
  alternate: Record<number, string>;
}
function isAddAlternateAction(
  action: PuzzleAction
): action is AddAlternateAction {
  return action.type === 'ADDALT';
}

export interface DelAlternateAction extends PuzzleAction {
  type: 'DELALT';
  alternate: Record<number, string>;
}
function isDelAlternateAction(
  action: PuzzleAction
): action is DelAlternateAction {
  return action.type === 'DELALT';
}

export interface SetHighlightAction extends PuzzleAction {
  type: 'SETHIGHLIGHT';
  highlight: 'circle' | 'shade';
}
function isSetHighlightAction(
  action: PuzzleAction
): action is SetHighlightAction {
  return action.type === 'SETHIGHLIGHT';
}

export interface ClickedFillAction extends PuzzleAction {
  type: 'CLICKEDFILL';
  entryIndex: number;
  value: string;
}
export function isClickedFillAction(
  action: PuzzleAction
): action is ClickedFillAction {
  return action.type === 'CLICKEDFILL';
}

export interface PublishAction extends PuzzleAction {
  type: 'PUBLISH';
  publishTimestamp: Timestamp;
}
export function isPublishAction(action: PuzzleAction): action is PublishAction {
  return action.type === 'PUBLISH';
}

export interface CancelPublishAction extends PuzzleAction {
  type: 'CANCELPUBLISH';
}
export function isCancelPublishAction(
  action: PuzzleAction
): action is CancelPublishAction {
  return action.type === 'CANCELPUBLISH';
}

export interface ImportPuzAction extends PuzzleAction {
  type: 'IMPORTPUZ';
  puz: PuzzleInProgressT;
}
export function isImportPuzAction(
  action: PuzzleAction
): action is ImportPuzAction {
  return action.type === 'IMPORTPUZ';
}

export interface NewPuzzleAction extends PuzzleAction {
  type: 'NEWPUZZLE';
  rows: number;
  cols: number;
  prefill?: PrefillSquares;
  commentsDisabled?: boolean;
}
export function isNewPuzzleAction(
  action: PuzzleAction
): action is NewPuzzleAction {
  return action.type === 'NEWPUZZLE';
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

export interface StopDownsOnlyAction extends PuzzleAction {
  type: 'STOPDOWNSONLY';
}
function isStopDownsOnlyAction(
  action: PuzzleAction
): action is StopDownsOnlyAction {
  return action.type === 'STOPDOWNSONLY';
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

export interface StartSelectionAction extends PuzzleAction {
  type: 'STARTSELECTION';
  position: Position;
}
function isStartSelectionAction(
  action: PuzzleAction
): action is StartSelectionAction {
  return action.type === 'STARTSELECTION';
}

export interface UpdateSelectionAction extends PuzzleAction {
  type: 'UPDATESELECTION';
  position: Position;
}
function isUpdateSelectionAction(
  action: PuzzleAction
): action is UpdateSelectionAction {
  return action.type === 'UPDATESELECTION';
}

export interface CheatAction extends PuzzleAction {
  type: 'CHEAT';
  unit: CheatUnit;
  isReveal?: boolean;
}
function isCheatAction(action: PuzzleAction): action is CheatAction {
  return action.type === 'CHEAT';
}

export interface ContestSubmitAction extends PuzzleAction {
  type: 'CONTESTSUBMIT';
  submission: string;
  displayName: string;
  email?: string;
}
function isContestSubmitAction(
  action: PuzzleAction
): action is ContestSubmitAction {
  return action.type === 'CONTESTSUBMIT';
}

export interface ContestRevealAction extends PuzzleAction {
  type: 'CONTESTREVEAL';
  displayName: string;
}
function isContestRevealAction(
  action: PuzzleAction
): action is ContestRevealAction {
  return action.type === 'CONTESTREVEAL';
}

export interface ToggleAutocheckAction extends PuzzleAction {
  type: 'TOGGLEAUTOCHECK';
}
function isToggleAutocheckAction(
  action: PuzzleAction
): action is ToggleAutocheckAction {
  return action.type === 'TOGGLEAUTOCHECK';
}

export interface ToggleClueViewAction extends PuzzleAction {
  type: 'TOGGLECLUEVIEW';
}
function isToggleClueViewAction(
  action: PuzzleAction
): action is ToggleClueViewAction {
  return action.type === 'TOGGLECLUEVIEW';
}

export interface RanSuccessEffectsAction extends PuzzleAction {
  type: 'RANSUCCESS';
}
function isRanSuccessEffectsAction(
  action: PuzzleAction
): action is RanSuccessEffectsAction {
  return action.type === 'RANSUCCESS';
}

export interface RanMetaSubmitEffectsAction extends PuzzleAction {
  type: 'RANMETASUBMIT';
}
function isRanMetaSubmitEffectsAction(
  action: PuzzleAction
): action is RanMetaSubmitEffectsAction {
  return action.type === 'RANMETASUBMIT';
}

export interface LoadPlayAction extends PuzzleAction {
  type: 'LOADPLAY';
  play: PlayWithoutUserT | null;
  prefs?: AccountPrefsFlagsT;
  isAuthor: boolean;
}
function isLoadPlayAction(action: PuzzleAction): action is LoadPlayAction {
  return action.type === 'LOADPLAY';
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

function postEdit(state: PuzzleState, cellIndex: number): PuzzleState;
function postEdit(state: BuilderState, cellIndex: number): BuilderState;
function postEdit<T extends GridInterfaceState>(state: T, cellIndex: number): T;
function postEdit(
  state: GridInterfaceState,
  cellIndex: number
): GridInterfaceState {
  if (isPuzzleState(state)) {
    state.wrongCells.delete(cellIndex);
    if (state.autocheck) {
      return checkComplete(cheat(state, CheatUnit.Square, false));
    }
    return checkComplete(state);
  }
  if (isBuilderState(state)) {
    return validateGrid(state);
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
      state.cellsIterationCount[ci] += 1;
    }
    let grid = state.grid;
    if (char === BLOCK) {
      if (valAt(grid, pos) !== BLOCK && grid.allowBlockEditing) {
        grid = gridWithBlockToggled(grid, pos, symmetry);
      }
    } else {
      grid = gridWithNewChar(grid, pos, char || EMPTY, symmetry);
    }
    state = clearSelection(state);
    state = postEdit({ ...state, grid }, ci);
  }
  return state;
}

function closeRebus<T extends GridInterfaceState>(state: T): T {
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

function clearSelection<T extends GridInterfaceState>(state: T): T {
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

function hasSelection<T extends GridInterfaceState>(state: T): boolean {
  return isBuilderState(state) && hasMultipleCells(state.selection);
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
  if (isStartSelectionAction(action)) {
    if (!isBuilderState(state)) {
      return state;
    }
    return {
      ...closeRebus(state),
      selection: emptySelection(action.position),
    };
  }
  if (isUpdateSelectionAction(action)) {
    if (!isBuilderState(state)) {
      return state;
    }
    return {
      ...closeRebus(state),
      wasEntryClick: false,
      active: { ...state.selection.start, dir: state.active.dir },
      selection: {
        ...state.selection,
        end: { ...action.position },
      },
    };
  }
  if (isCopyAction(action) || isCutAction(action)) {
    if (state.isEnteringRebus) {
      return state;
    }
    let toCopy = '';
    if (isBuilderState(state) && hasSelection(state)) {
      let grid = state.grid;
      let row: number;
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
    navigator.clipboard.writeText(toCopy).catch((e) => {
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
            .filter((x) => x.match(ALLOWABLE_GRID_CHARS) || x === BLOCK)
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
    if (key.k === KeyK.Backtick && isBuilderState(state)) {
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
    } else if (key.k === KeyK.ShiftArrowRight && isBuilderState(state)) {
      const { start, end } = hasSelection(state)
        ? state.selection
        : emptySelection(state.active);
      return {
        ...state,
        wasEntryClick: false,
        selection: {
          start,
          end: moveRight(state.grid, end),
        },
      };
    } else if (key.k === KeyK.ArrowRight || key.k === KeyK.ShiftArrowRight) {
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
    } else if (key.k === KeyK.ShiftArrowLeft && isBuilderState(state)) {
      const { start, end } = hasSelection(state)
        ? state.selection
        : emptySelection(state.active);
      return {
        ...state,
        wasEntryClick: false,
        selection: {
          start,
          end: moveLeft(state.grid, end),
        },
      };
    } else if (key.k === KeyK.ArrowLeft || key.k === KeyK.ShiftArrowLeft) {
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
    } else if (key.k === KeyK.ShiftArrowUp && isBuilderState(state)) {
      const { start, end } = hasSelection(state)
        ? state.selection
        : emptySelection(state.active);
      return {
        ...state,
        wasEntryClick: false,
        selection: {
          start,
          end: moveUp(state.grid, end),
        },
      };
    } else if (key.k === KeyK.ArrowUp || key.k === KeyK.ShiftArrowUp) {
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
    } else if (key.k === KeyK.ShiftArrowDown && isBuilderState(state)) {
      const { start, end } = hasSelection(state)
        ? state.selection
        : emptySelection(state.active);
      return {
        ...state,
        wasEntryClick: false,
        selection: {
          start,
          end: moveDown(state.grid, end),
        },
      };
    } else if (key.k === KeyK.ArrowDown || key.k === KeyK.ShiftArrowDown) {
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
    } else if (
      (key.k === KeyK.Dot || key.k === KeyK.Block) &&
      state.grid.allowBlockEditing
    ) {
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        const symmetry = isBuilderState(state) ? state.symmetry : Symmetry.None;
        const grid = gridWithBlockToggled(state.grid, state.active, symmetry);
        state = clearSelection(state);
        return {
          ...postEdit({ ...state, grid }, ci),
          wasEntryClick: false,
          active: nextCell(state.grid, state.active),
        };
      }
      return state;
    } else if (key.k === KeyK.Comma && state.grid.allowBlockEditing) {
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        const symmetry = isBuilderState(state) ? state.symmetry : Symmetry.None;
        const grid = gridWithBarToggled(state.grid, state.active, symmetry);
        state = clearSelection(state);
        return {
          ...postEdit({ ...state, grid }, ci),
          wasEntryClick: false,
        };
      }
      return state;
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
    } else if (key.k === KeyK.Octothorp && state.type === 'builder') {
      const ci = cellIndex(state.grid, state.active);
      if (state.isEditable(ci)) {
        const symmetry = isBuilderState(state) ? state.symmetry : Symmetry.None;
        const grid = gridWithHiddenToggled(state.grid, state.active, symmetry);
        return {
          ...postEdit({ ...state, grid }, ci),
          wasEntryClick: false,
        };
      }
      return state;
    }
  }
  return state;
}

function normalizeAnswer(answer: string): string {
  return answer.trim();
}

function addAnswer(answers: string[], newAnswer: string): string[] {
  const updated = new Set(answers);
  updated.add(normalizeAnswer(newAnswer));
  return Array.from(updated.values());
}

function removeAnswer(answers: string[], toRemove: string): string[] {
  const updated = new Set(answers);
  updated.delete(normalizeAnswer(toRemove));
  return Array.from(updated.values());
}

export function getClueProps(
  sortedEntries: number[],
  entries: ViewableEntry[],
  clues: Record<string, string[]>,
  requireComplete: boolean
) {
  const ac: string[] = [];
  const an: number[] = [];
  const dc: string[] = [];
  const dn: number[] = [];

  const wordCounts: Record<string, number> = {};

  sortedEntries.forEach((entryidx) => {
    const e = entries[entryidx];
    if (!e) {
      return;
    }
    if (requireComplete && !e.completedWord) {
      throw new Error('Publish unfinished grid');
    }
    const word = e.completedWord ?? '';
    const clueArray = clues[word] ?? [];
    const idx = wordCounts[word] ?? 0;
    wordCounts[word] = idx + 1;
    const clueString = clueArray[idx] ?? '';

    if (requireComplete && !clueString) {
      throw new Error('Bad clue for ' + e.completedWord);
    }
    if (e.direction === Direction.Across) {
      ac.push(clueString);
      an.push(e.labelNumber);
    } else {
      dc.push(clueString);
      dn.push(e.labelNumber);
    }
  });
  return { ac, an, dc, dn };
}

export function builderReducer(
  state: BuilderState,
  action: PuzzleAction
): BuilderState {
  state = gridInterfaceReducer(state, action);
  if (isSymmetryAction(action)) {
    if (
      (action.symmetry === Symmetry.DiagonalNESW ||
        action.symmetry === Symmetry.DiagonalNWSE) &&
      state.grid.width !== state.grid.height
    ) {
      // Don't allow diagonal symmetry for rectangles
      return state;
    }
    return { ...state, symmetry: action.symmetry };
  }
  if (isSetHighlightAction(action)) {
    state.grid.highlight = action.highlight;
    return { ...state };
  }
  if (isSetClueAction(action)) {
    const newVal = state.clues[action.word] ?? [];
    newVal[action.idx] = action.clue;
    return { ...state, clues: { ...state.clues, [action.word]: newVal } };
  }
  if (isSetTitleAction(action)) {
    return { ...state, title: action.value };
  }
  if (isSetPrivateAction(action)) {
    if (typeof action.value === 'boolean') {
      return { ...state, isPrivate: action.value, isPrivateUntil: null };
    }
    return { ...state, isPrivate: false, isPrivateUntil: action.value };
  }
  if (isSetBlogPostAction(action)) {
    return { ...state, blogPost: action.value };
  }
  if (isSetNotesAction(action)) {
    return { ...state, notes: action.value };
  }
  if (isSetShowDownloadLink(action)) {
    return { ...state, showDownloadLink: action.value };
  }
  if (isSetGuestConstructorAction(action)) {
    return { ...state, guestConstructor: action.value };
  }
  if (isSetCommentsDisabledAction(action)) {
    return { ...state, commentsDisabled: action.value };
  }
  if (isUpdateContestAction(action)) {
    return {
      ...state,
      ...(action.enabled !== undefined && { isContestPuzzle: action.enabled }),
      ...(action.addAnswer !== undefined && {
        contestAnswers: addAnswer(state.contestAnswers ?? [], action.addAnswer),
      }),
      ...(action.removeAnswer !== undefined && {
        contestAnswers: removeAnswer(
          state.contestAnswers ?? [],
          action.removeAnswer
        ),
      }),
      ...(action.hasPrize !== undefined && {
        contestHasPrize: action.hasPrize,
      }),
      ...(action.revealDelay !== undefined && {
        contestRevealDelay: action.revealDelay,
      }),
    };
  }
  if (isSetTagsAction(action)) {
    return {
      ...state,
      userTags: action.tags,
    };
  }
  if (isAddAlternateAction(action)) {
    state.alternates = state.alternates.filter(
      (a) => !equal(a, action.alternate)
    );
    state.alternates.push(action.alternate);
    return {
      ...state,
    };
  }
  if (isDelAlternateAction(action)) {
    return {
      ...state,
      alternates: state.alternates.filter((a) => !equal(a, action.alternate)),
    };
  }
  if (isClickedFillAction(action)) {
    return postEdit(
      {
        ...state,
        grid: gridWithEntrySet(state.grid, action.entryIndex, action.value),
      },
      0
    );
  }
  if (action.type === 'CLEARPUBLISHERRORS') {
    return { ...state, publishErrors: [], publishWarnings: [] };
  }
  if (isNewPuzzleAction(action)) {
    const initialFill = Array<string>(action.cols * action.rows).fill(EMPTY);
    if (action.prefill !== undefined) {
      for (let i = 0; i < action.rows; i++) {
        const iOdd = i % 2 === 0;
        for (let j = 0; j < action.cols; j++) {
          const jOdd = j % 2 === 0;
          const square = i * action.cols + j;
          if (!iOdd && !jOdd && action.prefill === PrefillSquares.OddOdd) {
            initialFill[square] = '.';
          } else if (
            !iOdd &&
            jOdd &&
            action.prefill === PrefillSquares.OddEven
          ) {
            initialFill[square] = '.';
          } else if (
            iOdd &&
            !jOdd &&
            action.prefill === PrefillSquares.EvenOdd
          ) {
            initialFill[square] = '.';
          } else if (
            iOdd &&
            jOdd &&
            action.prefill === PrefillSquares.EvenEven
          ) {
            initialFill[square] = '.';
          }
        }
      }
    }
    return initialBuilderState({
      id: null,
      width: action.cols,
      height: action.rows,
      grid: initialFill,
      vBars: [],
      hBars: [],
      hidden: [],
      title: null,
      notes: null,
      blogPost: null,
      guestConstructor: null,
      commentsDisabled: action.commentsDisabled,
      highlight: 'circle',
      highlighted: [],
      clues: {},
      authorId: state.authorId,
      authorName: state.authorName,
      editable: true,
      isPrivate: false,
      isPrivateUntil: null,
      contestAnswers: null,
      contestHasPrize: false,
      contestRevealDelay: null,
      alternates: null,
      userTags: [],
    });
  }
  if (isImportPuzAction(action)) {
    return initialBuilderStateFromSaved(action.puz, state);
  }
  if (isPublishAction(action)) {
    const errors = [];
    const warnings = [];
    if (!state.gridIsComplete) {
      errors.push('All squares in the grid must be filled in');
    }
    if (state.repeats.size > 0) {
      warnings.push(
        'Some words are repeated (' +
          Array.from(state.repeats).sort().join(', ') +
          ')'
      );
    }
    if (!state.title) {
      errors.push('Puzzle must have a title set');
    }
    if (state.isContestPuzzle) {
      if (!state.contestAnswers?.length) {
        errors.push('Contest puzzles must specify at least one answer');
      }
      if (!state.notes) {
        errors.push(
          'Contest puzzles must include a note to prompt the contest'
        );
      }
    }
    const missingClues = Object.entries(
      state.grid.entries
        .map((e) => e.completedWord ?? '')
        .reduce((counts: Record<string, number>, entry) => {
          counts[entry] = (counts[entry] ?? 0) + 1;
          return counts;
        }, {})
    )
      .filter(([entry, count]) => {
        const clues = state.clues[entry];
        if (!clues) {
          return true;
        }

        // Only count clues at the front of the array that have content
        let numCluesForEntry = clues.findIndex((c) => c.trim().length === 0);
        if (numCluesForEntry === -1) {
          numCluesForEntry = clues.length;
        }
        return numCluesForEntry < count;
      })
      .map(([entry]) => entry);
    if (missingClues.length) {
      errors.push(
        'Some words are missing clues: ' + missingClues.sort().join(', ')
      );
    }

    if (errors.length) {
      return { ...state, publishErrors: errors, publishWarnings: warnings };
    }

    const puzzle: DBPuzzleT = {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      t: state.title || 'Anonymous',
      a: state.authorId,
      n: state.authorName,
      m: false,
      p: action.publishTimestamp,
      c: null,
      h: state.grid.height,
      w: state.grid.width,
      g: state.grid.cells,
      ...(state.userTags.length > 0 && { tg_u: state.userTags }),
      ...(state.grid.vBars.size && { vb: Array.from(state.grid.vBars) }),
      ...(state.grid.hBars.size && { hb: Array.from(state.grid.hBars) }),
      ...(state.grid.hidden.size && { hdn: Array.from(state.grid.hidden) }),
      ...getClueProps(
        state.grid.sortedEntries,
        state.grid.entries,
        state.clues,
        true
      ),
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      ...(state.alternates.length && { alts: state.alternates }),
      ...(state.notes && { cn: state.notes }),
      ...(state.blogPost && { bp: state.blogPost }),
      ...(state.guestConstructor && { gc: state.guestConstructor }),
      ...(state.commentsDisabled && { no_cs: true }),
      ...(state.isPrivate
        ? { pv: true }
        : {
            pvu:
              state.isPrivateUntil &&
              state.isPrivateUntil > action.publishTimestamp
                ? state.isPrivateUntil
                : action.publishTimestamp,
          }),
      ...(state.isContestPuzzle &&
        state.contestAnswers?.length && {
          ct_ans: state.contestAnswers,
          ct_prz: state.contestHasPrize || false,
          ...(state.contestRevealDelay && {
            ct_rv_dl: state.contestRevealDelay,
          }),
        }),
    };
    if (state.grid.highlighted.size) {
      puzzle.hs = Array.from(state.grid.highlighted);
      if (state.grid.highlight === 'shade') {
        puzzle.s = true;
      }
    }
    return { ...state, toPublish: puzzle, publishWarnings: warnings };
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
  return (
    state.bankedSeconds +
    (new Date().getTime() - state.currentTimeWindowStart) / 1000
  );
}

export function puzzleReducer(
  state: PuzzleState,
  action: PuzzleAction
): PuzzleState {
  state = gridInterfaceReducer(state, action);
  if (isCheatAction(action)) {
    return cheat(state, action.unit, action.isReveal === true);
  }
  if (isContestSubmitAction(action)) {
    return {
      ...state,
      ...(state.contestSubmission && {
        contestPriorSubmissions: (state.contestPriorSubmissions ?? []).concat([
          state.contestSubmission,
        ]),
      }),
      ranMetaSubmitEffects: false,
      contestSubmission: action.submission,
      contestEmail: action.email,
      contestDisplayName: action.displayName,
      contestSubmitTime: new Date().getTime(),
    };
  }
  if (isContestRevealAction(action)) {
    return {
      ...state,
      ranMetaSubmitEffects: false,
      contestRevealed: true,
      contestDisplayName: action.displayName,
      contestSubmitTime: new Date().getTime(),
    };
  }
  if (isRanSuccessEffectsAction(action)) {
    return { ...state, ranSuccessEffects: true };
  }
  if (isStopDownsOnlyAction(action)) {
    return { ...state, downsOnly: false };
  }
  if (isRanMetaSubmitEffectsAction(action)) {
    return { ...state, ranMetaSubmitEffects: true };
  }
  if (isLoadPlayAction(action)) {
    if (action.isAuthor) {
      return {
        ...state,
        prefs: action.prefs,
        success: true,
        ranSuccessEffects: true,
        ranMetaSubmitEffects: true,
        grid: { ...state.grid, cells: state.answers },
      };
    }
    const play = action.play;
    if (play === null) {
      const downsOnly = action.prefs?.solveDownsOnly ?? false;
      return {
        ...state,
        downsOnly,
        active: {
          ...state.active,
          dir: downsOnly ? Direction.Down : state.active.dir,
        },
        prefs: action.prefs,
        loadedPlayState: true,
      };
    }
    const downsOnly = play.do ?? false;
    return {
      ...state,
      prefs: action.prefs,
      loadedPlayState: true,
      grid: { ...state.grid, cells: play.g },
      verifiedCells: new Set<number>(play.vc),
      wrongCells: new Set<number>(play.wc),
      revealedCells: new Set<number>(play.rc),
      success: play.f,
      ranSuccessEffects: play.f,
      downsOnly,
      active: {
        ...state.active,
        dir: downsOnly ? Direction.Down : state.active.dir,
      },
      displaySeconds: play.t,
      bankedSeconds: play.t,
      didCheat: play.ch,
      cellsUpdatedAt: play.ct,
      cellsIterationCount: play.uc,
      cellsEverMarkedWrong: new Set<number>(play.we),
      ...(play.ct_rv && {
        contestRevealed: true,
        contestSubmitTime: play.ct_t?.toMillis(),
      }),
      ...(play.ct_sub && {
        ranMetaSubmitEffects: true,
        contestPriorSubmissions: play.ct_pr_subs,
        contestDisplayName: play.ct_n,
        contestSubmission: play.ct_sub,
        contestEmail: play.ct_em,
        contestSubmitTime: play.ct_t?.toMillis(),
      }),
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
    return {
      ...state,
      currentTimeWindowStart: new Date().getTime(),
    };
  }
  if (action.type === 'PAUSEACTION') {
    if (state.currentTimeWindowStart === 0) {
      return state;
    }
    return {
      ...state,
      bankedSeconds: getCurrentTime(state),
      currentTimeWindowStart: 0,
    };
  }
  if (action.type === 'TICKACTION') {
    return { ...state, displaySeconds: getCurrentTime(state) };
  }
  if (action.type === 'DISMISSKEEPTRYING') {
    const currentTimeWindowStart =
      state.currentTimeWindowStart || new Date().getTime();
    return {
      ...state,
      currentTimeWindowStart,
      dismissedKeepTrying: true,
    };
  }
  if (action.type === 'DISMISSSUCCESS') {
    return { ...state, dismissedSuccess: true };
  }
  if (action.type === 'UNDISMISSSUCCESS') {
    return { ...state, dismissedSuccess: false };
  }
  if (action.type === 'TOGGLEMODERATING') {
    return { ...state, moderating: !state.moderating };
  }
  if (action.type === 'TOGGLEEMBEDOVERLAY') {
    return { ...state, showingEmbedOverlay: !state.showingEmbedOverlay };
  }
  return state;
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

export function advanceActiveToNonBlock(state: PuzzleState) {
  return {
    ...state,
    active: {
      ...nextNonBlock(state.grid, state.active),
      dir: Direction.Across,
    },
  };
}
