import { PlayWithoutUserT } from '../lib/dbtypes.js';
import { AccountPrefsFlagsT } from '../lib/prefs.js';
import { CheatUnit, Direction, KeyK, NonEmptyArray } from '../lib/types.js';
import {
  CluedGrid,
  advanceTo,
  moveDown,
  moveLeft,
  moveRight,
  moveToEntry,
  moveToEntryInActiveDirection,
  moveUp,
  nextNonBlock,
} from '../lib/viewableGrid.js';
import { PuzzleAction, isKeypressAction } from './commonActions.js';
import { GridInterfaceState, gridInterfaceReducer } from './gridReducer.js';
import { cheat, getCurrentTime } from './puzzleUtils.js';

export interface PuzzleState extends GridInterfaceState {
  type: 'puzzle';
  grid: CluedGrid;
  prefs?: AccountPrefsFlagsT;
  answers: string[];
  alternateSolutions: [number, string][][];
  solutions: NonEmptyArray<string[]>;
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

export interface StopDownsOnlyAction extends PuzzleAction {
  type: 'STOPDOWNSONLY';
}
function isStopDownsOnlyAction(
  action: PuzzleAction
): action is StopDownsOnlyAction {
  return action.type === 'STOPDOWNSONLY';
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

export function puzzleReducer(
  state: PuzzleState,
  action: PuzzleAction
): PuzzleState {
  state = gridInterfaceReducer(state, action);
  if (isKeypressAction(action)) {
    const key = action.key;
    if (key.k === KeyK.ShiftArrowRight) {
      return {
        ...state,
        wasEntryClick: false,
        active: advanceTo(
          state.grid,
          state.active,
          state.active.dir === Direction.Across
            ? moveToEntryInActiveDirection(state.grid, state.active)
            : moveToEntry(state.grid, state.active, moveRight),
          state.wrongCells
        ),
      };
    } else if (key.k === KeyK.ShiftArrowLeft) {
      return {
        ...state,
        wasEntryClick: false,
        active: advanceTo(
          state.grid,
          state.active,
          state.active.dir === Direction.Across
            ? moveToEntryInActiveDirection(state.grid, state.active, true)
            : moveToEntry(state.grid, state.active, moveLeft),
          state.wrongCells
        ),
      };
    } else if (key.k === KeyK.ShiftArrowUp) {
      return {
        ...state,
        wasEntryClick: false,
        active: advanceTo(
          state.grid,
          state.active,
          state.active.dir === Direction.Down
            ? moveToEntryInActiveDirection(state.grid, state.active, true)
            : moveToEntry(state.grid, state.active, moveUp),
          state.wrongCells
        ),
      };
    } else if (key.k === KeyK.ShiftArrowDown) {
      return {
        ...state,
        wasEntryClick: false,
        active: advanceTo(
          state.grid,
          state.active,
          state.active.dir === Direction.Down
            ? moveToEntryInActiveDirection(state.grid, state.active)
            : moveToEntry(state.grid, state.active, moveDown),
          state.wrongCells
        ),
      };
    }
    return state;
  }
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
        grid: { ...state.grid, cells: state.solutions[0] },
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

export function advanceActiveToNonBlock(state: PuzzleState) {
  return {
    ...state,
    active: {
      ...nextNonBlock(state.grid, state.active),
      dir: Direction.Across,
    },
  };
}
