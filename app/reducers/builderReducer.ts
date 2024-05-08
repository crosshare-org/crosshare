import equal from 'fast-deep-equal';
import { DBPuzzleT } from '../lib/dbtypes';
import { getDocId } from '../lib/firebaseWrapper';
import { gridWithEntrySet } from '../lib/gridBase';
import { parseClueEnumeration } from '../lib/parse';
import { GridSelection, emptySelection } from '../lib/selection';
import { Timestamp } from '../lib/timestamp';
import {
  Direction,
  EMPTY,
  KeyK,
  Position,
  PrefillSquares,
  PuzzleInProgressT,
  Symmetry,
} from '../lib/types';
import {
  ViewableEntry,
  ViewableGrid,
  fromCells,
  gridEqual,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
} from '../lib/viewableGrid';
import {
  forEachCluedEntry,
  getWarningStats,
  hasSelection,
  postEdit,
  validateGrid,
} from './builderUtils';
import { PuzzleAction, isKeypressAction } from './commonActions';
import {
  GridInterfaceState,
  closeRebus,
  gridInterfaceReducer,
} from './gridReducer';

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
  undoHistory: BuilderGrid[];
  undoIndex: number;
  cluesBackup: Record<string, string[]> | null;
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
    undoHistory: [fromCells(initialGrid)],
    undoIndex: 0,
    cluesBackup: null,
  });
}

export interface UndoAction extends PuzzleAction {
  type: 'UNDO';
}
function isUndoAction(action: PuzzleAction): action is UndoAction {
  return action.type === 'UNDO';
}

export interface RedoAction extends PuzzleAction {
  type: 'REDO';
}
function isRedoAction(action: PuzzleAction): action is RedoAction {
  return action.type === 'REDO';
}

export interface SymmetryAction extends PuzzleAction {
  type: 'CHANGESYMMETRY';
  symmetry: Symmetry;
}
function isSymmetryAction(action: PuzzleAction): action is SymmetryAction {
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
function isClickedFillAction(
  action: PuzzleAction
): action is ClickedFillAction {
  return action.type === 'CLICKEDFILL';
}

export interface PublishAction extends PuzzleAction {
  type: 'PUBLISH';
  publishTimestamp: Timestamp;
}
function isPublishAction(action: PuzzleAction): action is PublishAction {
  return action.type === 'PUBLISH';
}

export interface CancelPublishAction extends PuzzleAction {
  type: 'CANCELPUBLISH';
}
function isCancelPublishAction(
  action: PuzzleAction
): action is CancelPublishAction {
  return action.type === 'CANCELPUBLISH';
}

export interface ImportPuzAction extends PuzzleAction {
  type: 'IMPORTPUZ';
  puz: PuzzleInProgressT;
}
function isImportPuzAction(action: PuzzleAction): action is ImportPuzAction {
  return action.type === 'IMPORTPUZ';
}

export interface NewPuzzleAction extends PuzzleAction {
  type: 'NEWPUZZLE';
  rows: number;
  cols: number;
  prefill?: PrefillSquares;
  commentsDisabled?: boolean;
}
function isNewPuzzleAction(action: PuzzleAction): action is NewPuzzleAction {
  return action.type === 'NEWPUZZLE';
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

export interface AddEnumerationsAction extends PuzzleAction {
  type: 'ADDENUMERATIONS';
}
function isAddEnumerationsAction(
  action: PuzzleAction
): action is AddEnumerationsAction {
  return action.type === 'ADDENUMERATIONS';
}

export interface RestoreCluesAction extends PuzzleAction {
  type: 'RESTORECLUES';
}
function isRestoreCluesAction(
  action: PuzzleAction
): action is RestoreCluesAction {
  return action.type === 'RESTORECLUES';
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

function pushToHistory(state: BuilderState): BuilderState {
  const prevGrid = state.undoHistory[state.undoIndex];
  if (gridEqual(prevGrid, state.grid)) {
    return state;
  }

  const MAX_HISTORY_LENGTH = 21;
  const start = state.undoIndex === MAX_HISTORY_LENGTH - 1 ? 1 : 0;
  const end = state.undoIndex + 1;
  const undoHistory = [
    ...state.undoHistory.slice(start, end),
    fromCells(state.grid),
  ];
  const undoIndex = undoHistory.length - 1;

  return { ...state, undoHistory, undoIndex };
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

  forEachCluedEntry(sortedEntries, entries, clues, (e, clueString) => {
    if (requireComplete && !e.completedWord) {
      throw new Error('Publish unfinished grid');
    }

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

function _builderReducer(
  state: BuilderState,
  action: PuzzleAction
): BuilderState {
  if (isKeypressAction(action)) {
    const key = action.key;
    if (key.k === KeyK.ShiftArrowRight) {
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
    } else if (key.k === KeyK.ShiftArrowLeft) {
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
    } else if (key.k === KeyK.ShiftArrowUp) {
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
    } else if (key.k === KeyK.ShiftArrowDown) {
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
    }
    return state;
  }
  if (isStartSelectionAction(action)) {
    return {
      ...closeRebus(state),
      selection: emptySelection(action.position),
    };
  }
  if (isUpdateSelectionAction(action)) {
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
  if (isAddEnumerationsAction(action)) {
    // Deep copy clues
    const clues = { ...state.clues };
    for (const answer in clues) {
      const answerClues = clues[answer];
      if (answerClues != null) {
        clues[answer] = answerClues.slice();
      }
    }
    // Modify only clues that have entries
    forEachCluedEntry(
      state.grid.sortedEntries,
      state.grid.entries,
      state.clues,
      (_entry, clue, answer, clueIndex) => {
        const answerClues = clues[answer];
        if (
          answerClues != null &&
          answerClues.length > clueIndex &&
          clue.trim().length > 0 &&
          parseClueEnumeration(clue) == null
        ) {
          answerClues[clueIndex] = `${clue} (${answer.length})`;
        }
      }
    );
    return { ...state, clues, cluesBackup: { ...state.clues } };
  }
  if (isRestoreCluesAction(action)) {
    if (state.cluesBackup == null) {
      return state;
    }
    return { ...state, clues: { ...state.cluesBackup }, cluesBackup: null };
  }
  if (isClickedFillAction(action)) {
    const grid = gridWithEntrySet(state.grid, action.entryIndex, action.value);
    state = postEdit({ ...state, grid }, 0);
    return state;
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
        .filter((e) => e)
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

    if (state.repeats.size > 0) {
      warnings.push(
        'Some words are repeated (' +
          Array.from(state.repeats).sort().join(', ') +
          ')'
      );
    }
    const stats = getWarningStats(state);
    if (stats.shortWords.size > 0) {
      warnings.push(
        'Some words are only two letters long (' +
          Array.from(stats.shortWords).sort().join(', ') +
          ')'
      );
    }
    if (stats.hasUnches) {
      warnings.push(
        'Some letters are unchecked and the puzzle is not tagged as cryptic'
      );
    }
    if (stats.unmatchedRefs.size > 0) {
      warnings.push(
        `Some clues reference entries that don't exist: (${Array.from(
          stats.unmatchedRefs
        )
          .sort()
          .join(', ')})`
      );
    }
    if (stats.missingEnums && stats.missingEnums.size > 0) {
      warnings.push(
        `Some clues are missing enumerations: (${Array.from(stats.missingEnums)
          .sort()
          .join(', ')})`
      );
    }
    if (stats.wrongEnums && stats.wrongEnums.size > 0) {
      warnings.push(
        `Some clues have enumerations that don't match the answer length: (${Array.from(
          stats.wrongEnums
        )
          .sort()
          .join(', ')})`
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
  if (isUndoAction(action)) {
    const undoIndex = Math.max(state.undoIndex - 1, 0);
    const grid = state.undoHistory[undoIndex];
    return grid == null ? state : { ...state, grid, undoIndex };
  }
  if (isRedoAction(action)) {
    const undoIndex = Math.min(
      state.undoIndex + 1,
      state.undoHistory.length - 1
    );
    const grid = state.undoHistory[undoIndex];
    return grid == null ? state : { ...state, grid, undoIndex };
  }
  return state;
}

export function builderReducer(
  state: BuilderState,
  action: PuzzleAction
): BuilderState {
  state = gridInterfaceReducer(state, action);
  state = _builderReducer(state, action);
  state = pushToHistory(state);
  return state;
}
