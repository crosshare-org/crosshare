import { isSome, none, Option, some } from 'fp-ts/lib/Option';
import * as t from 'io-ts';
import type { WordDBT } from './WordDB';

import { DBPuzzleT, CommentWithRepliesT, GlickoScoreT } from '../lib/dbtypes';
import { ConstructorPageWithMarkdown } from '../lib/constructorPage';
import type { Root } from 'hast';
import { isTextInput } from './domUtils';

export type Optionalize<T extends K, K> = Omit<T, keyof K>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export function hasOwnProperty<
  X extends Record<string, unknown>,
  Y extends PropertyKey
>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

// io-ts enum support
export const fromEnum = <T extends string, TEnumValue extends string | number>(
  enumName: string,
  theEnum: { [key in T]: TEnumValue }
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
  dir: 0 | 1;
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
  highlighted: number[];
  highlight: 'circle' | 'shade';
  comments: CommentWithRepliesT[];
  commentsDisabled: boolean;
  constructorNotes: string | null;
  blogPost: string | null;
  isPrivate: boolean | number;
  isPrivateUntil: number | null;
  contestAnswers: string[] | null;
  contestHasPrize: boolean;
  contestSubmissions: { n: string; t: number; s: string }[] | null;
  contestRevealDelay: number | null;
  rating: GlickoScoreT | null;
  alternateSolutions: [number, string][][];
  dailyMiniDate?: string;
  userTags?: string[];
  autoTags?: string[];
  forcedTags?: string[];
}

export interface PuzzleResult extends PuzzleT {
  id: string;
}

// This is kind of a hack but it helps us to ensure we only query for constructorPages on server side
export interface ServerPuzzleResult
  extends Omit<PuzzleResult, 'comments' | 'constructorNotes' | 'blogPost'> {
  blogPost: Root | null;
  blogPostRaw: string | null;
  constructorNotes: Root | null;
  constructorPage: ConstructorPageWithMarkdown | null;
  constructorIsPatron: boolean;
  clueHasts: Root[];
}
export interface PuzzleResultWithAugmentedComments extends ServerPuzzleResult {
  comments: Comment[];
}

export function dbCluesToClueTArray(
  ac: string[],
  an: number[],
  dc: string[],
  dn: number[],
  cx?: Record<number, string>
): ClueT[] {
  const clues: ClueT[] = [];
  for (const [i, clue] of ac.entries()) {
    const explanation = cx?.[i] || null;
    const num = an[i];
    if (num === undefined) {
      throw new Error('oob');
    }
    clues.push({
      dir: Direction.Across,
      clue,
      num,
      explanation,
    });
  }
  for (const [i, clue] of dc.entries()) {
    const explanation = cx?.[i + ac.length] || null;
    const num = dn[i];
    if (num === undefined) {
      throw new Error('oob');
    }
    clues.push({
      dir: Direction.Down,
      clue,
      num,
      explanation,
    });
  }
  return clues;
}

export function puzzleFromDB(dbPuzzle: DBPuzzleT): PuzzleT {
  const clues = dbCluesToClueTArray(
    dbPuzzle.ac,
    dbPuzzle.an,
    dbPuzzle.dc,
    dbPuzzle.dn,
    dbPuzzle.cx
  );
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
    highlighted: dbPuzzle.hs || [],
    highlight: dbPuzzle.s ? 'shade' : 'circle',
    comments: dbPuzzle.cs || [],
    commentsDisabled: dbPuzzle.no_cs || false,
    constructorNotes: dbPuzzle.cn || null,
    blogPost: dbPuzzle.bp || null,
    isPrivate:
      typeof dbPuzzle.pv === 'boolean'
        ? dbPuzzle.pv
        : dbPuzzle.pv?.toMillis() || false,
    isPrivateUntil: dbPuzzle.pvu ? dbPuzzle.pvu.toMillis() : null,
    contestAnswers: dbPuzzle.ct_ans || null,
    contestHasPrize: dbPuzzle.ct_prz || false,
    contestSubmissions:
      dbPuzzle.ct_subs?.map((w) => ({ n: w.n, t: w.t.toMillis(), s: w.s })) ||
      null,
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
  };
}

const PuzzleInProgressBaseV = t.intersection([
  t.type({
    width: t.number,
    height: t.number,
    grid: t.array(t.string),
    highlighted: t.array(t.number),
    highlight: t.keyof({ circle: null, shade: null }),
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
]);
export type PuzzleInProgressT = t.TypeOf<typeof PuzzleInProgressV>;

export const PuzzleInProgressStrictV = t.intersection([
  PuzzleInProgressBaseV,
  t.type({
    /** Clues are a map from ENTRY => Array of clues for that entry */
    clues: t.record(t.string, t.array(t.string)),
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
}

export const ALLOWABLE_GRID_CHARS = /^[A-Za-z0-9Ññ&]$/;

export function fromKeyString(string: string): Option<Key> {
  return fromKeyboardEvent({ key: string });
}

export function fromKeyboardEvent(event: {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  target?: EventTarget | null;
}): Option<Key> {
  if (event.target) {
    if (isTextInput(event.target)) {
      return none;
    }
  }

  if (event.altKey) {
    return none;
  }

  if (event.metaKey || event.ctrlKey) {
    const key = event.key.toLowerCase();
    switch (key) {
      case 'z':
        return some({ k: event.shiftKey ? KeyK.Redo : KeyK.Undo });
      case 'y':
        return some({ k: KeyK.Redo });
      default:
        return none;
    }
  }

  const basicKey: Option<Exclude<KeyK, KeyK.AllowedCharacter>> = (() => {
    switch (event.key) {
      case 'ArrowLeft':
        return !event.shiftKey
          ? some(KeyK.ArrowLeft)
          : some(KeyK.ShiftArrowLeft);
      case 'ArrowRight':
        return !event.shiftKey
          ? some(KeyK.ArrowRight)
          : some(KeyK.ShiftArrowRight);
      case 'ArrowUp':
        return !event.shiftKey ? some(KeyK.ArrowUp) : some(KeyK.ShiftArrowUp);
      case 'ArrowDown':
        return !event.shiftKey
          ? some(KeyK.ArrowDown)
          : some(KeyK.ShiftArrowDown);
      case ' ':
        return some(KeyK.Space);
      case 'Tab':
        return !event.shiftKey ? some(KeyK.Tab) : some(KeyK.ShiftTab);
      case 'Enter':
        return !event.shiftKey ? some(KeyK.Enter) : some(KeyK.ShiftEnter);
      case 'Backspace':
        return some(KeyK.Backspace);
      case 'Delete':
        return some(KeyK.Delete);
      case 'Escape':
        return some(KeyK.Escape);
      case '`':
        return some(KeyK.Backtick);
      case '.':
        return some(KeyK.Dot);
      case ',':
        return some(KeyK.Comma);
      case '!':
        return some(KeyK.Exclamation);
      case '#':
        return some(KeyK.Octothorp);
      // Keys specific to on-screen keyboard
      case '{num}':
        return some(KeyK.NumLayout);
      case '{abc}':
        return some(KeyK.AbcLayout);
      case '{dir}':
        return some(KeyK.Direction);
      case '{next}':
        return some(KeyK.Next);
      case '{prev}':
        return some(KeyK.Prev);
      case '{nextEntry}':
        return some(KeyK.NextEntry);
      case '{prevEntry}':
        return some(KeyK.PrevEntry);
      case '{bksp}':
        return some(KeyK.OskBackspace);
      case '{rebus}':
        return some(KeyK.Rebus);
      case '{block}':
        return some(KeyK.Block);
      default:
        return none;
    }
  })();

  if (isSome(basicKey)) {
    return some({ k: basicKey.value });
  }
  if (event.key.match(ALLOWABLE_GRID_CHARS)) {
    return some({ k: KeyK.AllowedCharacter, c: event.key });
  }
  return none;
}
