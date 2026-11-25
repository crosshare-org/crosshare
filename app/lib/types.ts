import type { Root } from 'hast';
import * as t from 'io-ts';
import {
  ConstructorPageBarebones,
  ConstructorPageWithMarkdown,
} from '../lib/constructorPage.js';
import {
  CommentWithRepliesT,
  DBPuzzleT,
  GlickoScoreT,
} from '../lib/dbtypes.js';
import type { WordDBT } from './WordDB.js';
import { isTextInput } from './domUtils.js';
import { isMetaSolution, metaSolutionDigest } from './utils.js';

export type Optionalize<T extends K, K> = Omit<T, keyof K>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type NonEmptyArray<T> = [T, ...T[]];

export function hasOwnProperty<
  X extends Record<string, unknown>,
  Y extends PropertyKey,
>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

// io-ts enum support
export const fromEnum = <T extends string, TEnumValue extends string | number>(
  enumName: string,
  theEnum: Record<T, TEnumValue>
): t.Type<TEnumValue> => {
  const isEnumValue = (input: unknown): input is TEnumValue =>
    Object.values(theEnum).includes(input);

  return new t.Type<TEnumValue>(
    enumName,
    isEnumValue,
    (input, context) =>
      isEnumValue(input) ? t.success(input) : t.failure(input, context),
    t.identity
  );
};

export const BLOCK = '.';
export const EMPTY = ' ';
export const CELL_DELIMITER = ',';
export const ROW_DELIMITER = '\n';
export const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

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
  Puzzle,
}

export enum PrefillSquares {
  EvenEven,
  OddOdd,
  EvenOdd,
  OddEven,
}

export enum Direction {
  Across,
  Down,
  /** Top-left to bottom-right (↘) */
  Diagonal,
  /** Top-right to bottom-left (↙) */
  DiagonalDownLeft,
}

/** Number of Direction enum values. */
export const DIRECTION_COUNT = 4;

export const ORTHOGONAL_DIRECTIONS: Direction[] = [
  Direction.Across,
  Direction.Down,
];

export const DIAGONAL_DIRECTIONS: Direction[] = [
  Direction.Diagonal,
  Direction.DiagonalDownLeft,
];

export const ALL_DIRECTIONS: Direction[] = [
  ...ORTHOGONAL_DIRECTIONS,
  ...DIAGONAL_DIRECTIONS,
];

export function enabledDirections(diagonals: boolean): Direction[] {
  return diagonals ? ALL_DIRECTIONS : ORTHOGONAL_DIRECTIONS;
}

export function isDiagonalDirection(dir: Direction): boolean {
  return dir >= Direction.Diagonal;
}

/**
 * Diagonal arrows with text presentation (VS15 / U+FE0E) so platforms that
 * otherwise swap them for emoji glyphs keep a consistent text style.
 */
const ARROW_SE = '\u2198\uFE0E'; // ↘
const ARROW_SW = '\u2199\uFE0E'; // ↙

export function directionString(dir: Direction): string {
  switch (dir) {
    case Direction.Across:
      return 'A';
    case Direction.Down:
      return 'D';
    case Direction.Diagonal:
      return ARROW_SE;
    case Direction.DiagonalDownLeft:
      return ARROW_SW;
  }
}

/** Display name for clue list headers. */
export function directionLabel(dir: Direction): string {
  switch (dir) {
    case Direction.Across:
      return 'Across';
    case Direction.Down:
      return 'Down';
    case Direction.Diagonal:
      return ARROW_SE;
    case Direction.DiagonalDownLeft:
      return ARROW_SW;
  }
}

/** ipuz Direction keys (format-stable; not for UI). */
export function ipuzDirectionKey(dir: Direction): string {
  switch (dir) {
    case Direction.Across:
      return 'Across';
    case Direction.Down:
      return 'Down';
    case Direction.Diagonal:
      return 'Diagonal';
    case Direction.DiagonalDownLeft:
      return 'Diagonal Down Left';
  }
}

export function directionIncrement(dir: Direction): {
  row: number;
  col: number;
} {
  switch (dir) {
    case Direction.Across:
      return { row: 0, col: 1 };
    case Direction.Down:
      return { row: 1, col: 0 };
    case Direction.Diagonal:
      return { row: 1, col: 1 };
    case Direction.DiagonalDownLeft:
      return { row: 1, col: -1 };
  }
}

export interface WorkerMessage {
  type: string;
}
export interface AutofillResultMessage extends WorkerMessage {
  type: 'autofill-result';
  input: [string[], Set<number>, Set<number>];
  result: string[];
}
export function isAutofillResultMessage(
  msg: WorkerMessage
): msg is AutofillResultMessage {
  return msg.type === 'autofill-result';
}
export interface AutofillCompleteMessage extends WorkerMessage {
  type: 'autofill-complete';
}
export function isAutofillCompleteMessage(
  msg: WorkerMessage
): msg is AutofillCompleteMessage {
  return msg.type === 'autofill-complete';
}
export interface LoadDBMessage extends WorkerMessage {
  type: 'loaddb';
  db: WordDBT;
}
export function isLoadDBMessage(msg: WorkerMessage): msg is LoadDBMessage {
  return msg.type === 'loaddb';
}
export interface CancelAutofillMessage extends WorkerMessage {
  type: 'cancel';
}
export function isCancelAutofillMessage(
  msg: WorkerMessage
): msg is CancelAutofillMessage {
  return msg.type === 'cancel';
}
export interface AutofillMessage extends WorkerMessage {
  type: 'autofill';
  grid: string[];
  width: number;
  height: number;
  vBars: Set<number>;
  hBars: Set<number>;
}
export function isAutofillMessage(msg: WorkerMessage): msg is AutofillMessage {
  return msg.type === 'autofill';
}

export interface Position {
  row: number;
  col: number;
}

export interface PosAndDir extends Position {
  dir: Direction;
}

export function isSamePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export interface ClueT {
  num: number;
  dir: Direction;
  clue: string;
  explanation: string | null;
}

export function removeClueSpecials(c: string): string {
  if (c.startsWith('!@') || c.startsWith('!#')) {
    return c.substring(2).trim();
  }
  return c;
}

export function getClueText(c: { clue: string }): string {
  return removeClueSpecials(c.clue);
}

export interface Comment {
  commentText: string;
  commentHast: Root;
  authorId: string;
  authorDisplayName: string;
  authorUsername?: string;
  /** author solve time in fractional seconds */
  authorSolveTime: number;
  authorCheated: boolean;
  authorSolvedDownsOnly: boolean;
  /** comment publish timestamp in millis since epoch*/
  publishTime: number;
  id: string;
  replies?: Comment[];
  authorIsPatron: boolean;
  authorIsMod: boolean;
  /** has the comment been deleted/removed (might still be in thread if there were replies) */
  deleted?: boolean;
  removed?: boolean;
}

export interface PuzzleT {
  authorId: string;
  authorName: string;
  guestConstructor: string | null;
  moderated: boolean;
  publishTime: number;
  title: string;
  size: {
    rows: number;
    cols: number;
  };
  clues: ClueT[];
  grid: string[];
  vBars: number[];
  hBars: number[];
  hidden: number[];
  cellStyles: Record<string, number[]>;
  comments: CommentWithRepliesT[];
  commentsDisabled: boolean;
  constructorNotes: string | null;
  blogPost: string | null;
  isPrivate: boolean | number;
  isPrivateUntil: number | null;
  isContest: boolean;
  contestAnswers: string[];
  contestAnswerDigests: string[];
  contestHasPrize: boolean;
  contestWinningSubmissions: { n: string; t: number }[];
  contestRevealDelay: number | null;
  rating: GlickoScoreT | null;
  alternateSolutions: [number, string][][];
  dailyMiniDate?: string;
  userTags?: string[];
  autoTags?: string[];
  forcedTags?: string[];
  likes: string[];
  packId: string | null;
  /** When true, puzzle includes diagonal entries/clues. */
  diagonals: boolean;
}

export interface PuzzleResult extends PuzzleT {
  id: string;
}

// This is kind of a hack but it helps us to ensure we only query for constructorPages on server side
export interface ServerPuzzleResult extends Omit<
  PuzzleResult,
  'comments' | 'constructorNotes' | 'blogPost' | 'likes'
> {
  blogPost: Root | null;
  blogPostRaw: string | null;
  constructorNotes: Root | null;
  constructorPage: ConstructorPageWithMarkdown | null;
  constructorIsPatron: boolean;
  constructorIsMod: boolean;
  clueHasts: Root[];
  likes: Record<
    string,
    (ConstructorPageBarebones & { isPatron: boolean }) | null
  >;
}
export interface PuzzleResultWithAugmentedComments extends ServerPuzzleResult {
  comments: Comment[];
}

export interface DiagonalClueArrays {
  dac?: string[];
  dan?: number[];
  dlc?: string[];
  dln?: number[];
}

export function dbCluesToClueTArray(
  ac: string[],
  an: number[],
  dc: string[],
  dn: number[],
  cx?: Record<number, string>,
  diagonals?: DiagonalClueArrays
): ClueT[] {
  const clues: ClueT[] = [];
  let offset = 0;

  function pushDir(
    dir: Direction,
    texts: string[] | undefined,
    nums: number[] | undefined
  ) {
    if (!texts || !nums) {
      return;
    }
    for (const [i, clue] of texts.entries()) {
      const explanation = cx?.[offset + i] || null;
      const num = nums[i];
      if (num === undefined) {
        throw new Error('oob');
      }
      clues.push({
        dir,
        clue,
        num,
        explanation,
      });
    }
    offset += texts.length;
  }

  pushDir(Direction.Across, ac, an);
  pushDir(Direction.Down, dc, dn);
  pushDir(Direction.Diagonal, diagonals?.dac, diagonals?.dan);
  pushDir(Direction.DiagonalDownLeft, diagonals?.dlc, diagonals?.dln);
  return clues;
}

export function puzzleFromDB(
  dbPuzzle: DBPuzzleT,
  puzzleId: string,
  includeMetaSolutions = false
): PuzzleT {
  const clues = dbCluesToClueTArray(
    dbPuzzle.ac,
    dbPuzzle.an,
    dbPuzzle.dc,
    dbPuzzle.dn,
    dbPuzzle.cx,
    {
      dac: dbPuzzle.dac,
      dan: dbPuzzle.dan,
      dlc: dbPuzzle.dlc,
      dln: dbPuzzle.dln,
    }
  );

  let contestAnswers: string[] = [];
  let contestAnswerDigests: string[] = [];
  let isContest = false;
  if (dbPuzzle.ct_ans?.length) {
    isContest = true;
    if (includeMetaSolutions) {
      contestAnswers = dbPuzzle.ct_ans;
    } else {
      contestAnswerDigests = dbPuzzle.ct_ans.map((a) =>
        metaSolutionDigest(a, puzzleId)
      );
    }
  }

  const cellStyles = dbPuzzle.sty || {};
  if (dbPuzzle.hs) {
    if (dbPuzzle.s) {
      cellStyles.shade = Array.from(
        new Set([...(cellStyles.shade || []), ...dbPuzzle.hs])
      );
    } else {
      cellStyles.circle = Array.from(
        new Set([...(cellStyles.circle || []), ...dbPuzzle.hs])
      );
    }
  }

  return {
    authorId: dbPuzzle.a,
    authorName: dbPuzzle.n,
    guestConstructor: dbPuzzle.gc || null,
    moderated: dbPuzzle.m,
    publishTime: dbPuzzle.p.toMillis(),
    title: dbPuzzle.t,
    size: {
      rows: dbPuzzle.h,
      cols: dbPuzzle.w,
    },
    clues,
    grid: dbPuzzle.g,
    vBars: dbPuzzle.vb || [],
    hBars: dbPuzzle.hb || [],
    hidden: dbPuzzle.hdn || [],
    cellStyles,
    comments: dbPuzzle.cs || [],
    commentsDisabled: dbPuzzle.no_cs || false,
    constructorNotes: dbPuzzle.cn || null,
    blogPost: dbPuzzle.bp || null,
    isPrivate:
      typeof dbPuzzle.pv === 'boolean'
        ? dbPuzzle.pv
        : dbPuzzle.pv?.toMillis() || false,
    isPrivateUntil: dbPuzzle.pvu ? dbPuzzle.pvu.toMillis() : null,
    isContest,
    contestAnswers,
    contestAnswerDigests,
    contestHasPrize: dbPuzzle.ct_prz || false,
    contestWinningSubmissions:
      dbPuzzle.ct_subs
        ?.filter((w) =>
          isMetaSolution(w.s, dbPuzzle.ct_ans || [], [], puzzleId)
        )
        .map((w) => ({ n: w.n, t: w.t.toMillis() })) || [],
    contestRevealDelay: dbPuzzle.ct_rv_dl || null,
    rating: dbPuzzle.rtg || null,
    alternateSolutions:
      dbPuzzle.alts?.map((alt) =>
        Object.entries(alt).map(([n, s]) => [parseInt(n), s])
      ) || [],
    ...(dbPuzzle.dmd && { dailyMiniDate: dbPuzzle.dmd }),
    userTags: dbPuzzle.tg_u || [],
    autoTags: dbPuzzle.tg_a || [],
    forcedTags: dbPuzzle.tg_f || [],
    likes: dbPuzzle.lk || [],
    packId: dbPuzzle.pk || null,
    diagonals: dbPuzzle.dg === true,
  };
}

const PuzzleInProgressBaseV = t.intersection([
  t.type({
    width: t.number,
    height: t.number,
    grid: t.array(t.string),
    title: t.union([t.string, t.null]),
    notes: t.union([t.string, t.null]),
  }),
  t.partial({
    vBars: t.array(t.number),
    hBars: t.array(t.number),
    hidden: t.array(t.number),
    blogPost: t.union([t.string, t.null]),
    guestConstructor: t.union([t.string, t.null]),
    id: t.string,
    isPrivate: t.boolean,
    isPrivateUntil: t.union([t.number, t.null]),
    explanations: t.record(t.string, t.string),
    contestAnswers: t.array(t.string),
    contestHasPrize: t.boolean,
    contestRevealDelay: t.number,
    alternates: t.array(t.record(t.string, t.string)),
    userTags: t.array(t.string),
    commentsDisabled: t.boolean,
    symmetry: fromEnum('Symmetry', Symmetry),
    diagonals: t.boolean,
  }),
]);

export const PuzzleInProgressV = t.intersection([
  PuzzleInProgressBaseV,
  t.type({
    /** Clues are a map from ENTRY => CLUE.
     *
     * But new style is an array of CLUEs per ENTRY to support dupe entries. */
    clues: t.union([
      t.record(t.string, t.string),
      t.record(t.string, t.array(t.string)),
    ]),
  }),
  t.partial({
    /* New format for circles / shading */
    cellStyles: t.record(t.string, t.array(t.number)),
    /* This is the legacy way of supporting circles / shading */
    highlighted: t.array(t.number),
    highlight: t.keyof({ circle: null, shade: null }),
  }),
]);
export type PuzzleInProgressT = t.TypeOf<typeof PuzzleInProgressV>;

export const PuzzleInProgressStrictV = t.intersection([
  PuzzleInProgressBaseV,
  t.type({
    /** Clues are a map from ENTRY => Array of clues for that entry */
    clues: t.record(t.string, t.array(t.string)),
  }),
  t.partial({
    cellStyles: t.record(t.string, t.array(t.number)),
  }),
]);
export type PuzzleInProgressStrictT = t.TypeOf<typeof PuzzleInProgressStrictV>;

export type Key =
  | { k: KeyK.AllowedCharacter; c: string }
  | { k: Exclude<KeyK, KeyK.AllowedCharacter> };

export enum KeyK {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ShiftArrowRight,
  ShiftArrowLeft,
  ShiftArrowUp,
  ShiftArrowDown,
  Space,
  Tab,
  ShiftTab,
  Enter,
  ShiftEnter,
  Backspace,
  Delete,
  Escape,
  Backtick,
  Tilde,
  Dot,
  Comma,
  Exclamation,
  Octothorp,
  AllowedCharacter,
  // Keys specific to on-screen keyboard
  NumLayout,
  AbcLayout,
  Direction,
  Next,
  Prev,
  NextEntry,
  PrevEntry,
  OskBackspace,
  Rebus,
  Block,
  Undo,
  Redo,
  Draft,
  Home,
  End,
}

export const ALLOWABLE_GRID_CHARS = /^[A-Za-z0-9ÑÅÄÖñåäö&/\\$]$/;

export function fromKeyString(string: string): Key | null {
  return fromKeyboardEvent({ key: string });
}

export function fromKeyboardEvent(event: {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  target?: EventTarget | null;
}): Key | null {
  if (event.target) {
    if (isTextInput(event.target)) {
      return null;
    }
  }

  if (event.altKey) {
    return null;
  }

  if (event.metaKey || event.ctrlKey) {
    const key = event.key.toLowerCase();
    switch (key) {
      case 'z':
        return { k: event.shiftKey ? KeyK.Redo : KeyK.Undo };
      case 'y':
        return { k: KeyK.Redo };
      default:
        return null;
    }
  }

  const basicKey: Exclude<KeyK, KeyK.AllowedCharacter> | null = (() => {
    switch (event.key) {
      case 'ArrowLeft':
        return !event.shiftKey ? KeyK.ArrowLeft : KeyK.ShiftArrowLeft;
      case 'ArrowRight':
        return !event.shiftKey ? KeyK.ArrowRight : KeyK.ShiftArrowRight;
      case 'ArrowUp':
        return !event.shiftKey ? KeyK.ArrowUp : KeyK.ShiftArrowUp;
      case 'ArrowDown':
        return !event.shiftKey ? KeyK.ArrowDown : KeyK.ShiftArrowDown;
      case ' ':
        return KeyK.Space;
      case 'Tab':
        return !event.shiftKey ? KeyK.Tab : KeyK.ShiftTab;
      case 'Enter':
        return !event.shiftKey ? KeyK.Enter : KeyK.ShiftEnter;
      case 'Backspace':
        return KeyK.Backspace;
      case 'Delete':
        return KeyK.Delete;
      case 'Home':
        return KeyK.Home;
      case 'End':
        return KeyK.End;
      case 'Escape':
        return KeyK.Escape;
      case '`':
        return KeyK.Backtick;
      case '~':
        return KeyK.Tilde;
      case '.':
        return KeyK.Dot;
      case ',':
        return KeyK.Comma;
      case '!':
        return KeyK.Exclamation;
      case '#':
        return KeyK.Octothorp;
      // Keys specific to on-screen keyboard
      case '{num}':
        return KeyK.NumLayout;
      case '{abc}':
        return KeyK.AbcLayout;
      case '{dir}':
        return KeyK.Direction;
      case '{next}':
        return KeyK.Next;
      case '{prev}':
        return KeyK.Prev;
      case '{nextEntry}':
        return KeyK.NextEntry;
      case '{prevEntry}':
        return KeyK.PrevEntry;
      case '{bksp}':
        return KeyK.OskBackspace;
      case '{rebus}':
        return KeyK.Rebus;
      case '{block}':
        return KeyK.Block;
      case '{draft}':
        return KeyK.Draft;
      default:
        return null;
    }
  })();

  if (basicKey !== null) {
    return { k: basicKey };
  }
  if (ALLOWABLE_GRID_CHARS.exec(event.key)) {
    return { k: KeyK.AllowedCharacter, c: event.key };
  }
  return null;
}
