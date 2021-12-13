import { isSome, none, Option, some } from 'fp-ts/lib/Option';
import * as t from 'io-ts';
import type { WordDBT } from './WordDB';

import { DBPuzzleT, CommentWithRepliesT, GlickoScoreT } from '../lib/dbtypes';
import { ConstructorPageT } from '../lib/constructorPage';

export type Optionalize<T extends K, K> = Omit<T, keyof K>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const BLOCK = '.';

export enum Direction {
  Across,
  Down,
}

export interface WorkerMessage {
  type: string;
}
export interface AutofillResultMessage extends WorkerMessage {
  type: 'autofill-result';
  input: string[];
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

export interface ClueT {
  num: number;
  dir: 0 | 1;
  clue: string;
  explanation: string | null;
}

export function removeClueSpecials(c: string): string {
  if (c.startsWith('!@')) {
    return c.substring(2).trim();
  }
  return c;
}

export function getClueText(c: { clue: string }): string {
  return removeClueSpecials(c.clue);
}

export interface Comment {
  commentText: string;
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
  replies?: Array<Comment>;
  authorIsPatron: boolean;
}

export interface PuzzleT {
  authorId: string;
  category: string | null;
  authorName: string;
  guestConstructor: string | null;
  moderated: boolean;
  publishTime: number;
  title: string;
  size: {
    rows: number;
    cols: number;
  };
  clues: Array<ClueT>;
  grid: Array<string>;
  highlighted: Array<number>;
  highlight: 'circle' | 'shade';
  comments: Array<CommentWithRepliesT>;
  constructorNotes: string | null;
  blogPost: string | null;
  isPrivate: boolean | number;
  isPrivateUntil: number | null;
  contestAnswers: Array<string> | null;
  contestHasPrize: boolean;
  contestSubmissions: Array<{ n: string; t: number; s: string }> | null;
  contestRevealDelay: number | null;
  rating: GlickoScoreT | null;
  alternateSolutions: Array<Array<[number, string]>>;
}

export interface PuzzleResult extends PuzzleT {
  id: string;
}

// This is kind of a hack but it helps us to ensure we only query for constructorPages on server side
export interface ServerPuzzleResult extends Omit<PuzzleResult, 'comments'> {
  constructorPage: ConstructorPageT | null;
  constructorIsPatron: boolean;
}
export interface PuzzleResultWithAugmentedComments extends ServerPuzzleResult {
  comments: Array<Comment>;
}

export function puzzleFromDB(dbPuzzle: DBPuzzleT): PuzzleT {
  const clues: Array<ClueT> = [];
  for (const [i, clue] of dbPuzzle.ac.entries()) {
    const explanation = dbPuzzle.cx?.[i] || null;
    const num = dbPuzzle.an[i];
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
  for (const [i, clue] of dbPuzzle.dc.entries()) {
    const explanation = dbPuzzle.cx?.[i + dbPuzzle.ac.length] || null;
    const num = dbPuzzle.dn[i];
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
  return {
    authorId: dbPuzzle.a,
    category: dbPuzzle.c,
    authorName: dbPuzzle.n,
    guestConstructor: dbPuzzle.gc || null,
    moderated: dbPuzzle.m,
    publishTime: dbPuzzle.p.toMillis(),
    title: dbPuzzle.t,
    size: {
      rows: dbPuzzle.h,
      cols: dbPuzzle.w,
    },
    clues: clues,
    grid: dbPuzzle.g,
    highlighted: dbPuzzle.hs || [],
    highlight: dbPuzzle.s ? 'shade' : 'circle',
    comments: dbPuzzle.cs || [],
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

export type Key
  = { k: KeyK.AllowedCharacter, c: string }
  | { k: Exclude<KeyK, KeyK.AllowedCharacter> };

export enum KeyK {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Space,
  Tab,
  ShiftTab,
  Enter,
  Backspace,
  Delete,
  Escape,
  Backtick,
  Dot,
  Exclamation,
  AtSign,
  Hash,
  CtrlExclamation,
  CtrlAtSign,
  CtrlHash,
  Pause,
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
}

export const ALLOWABLE_GRID_CHARS = /^[A-Za-z0-9Ññ&]$/;

export function fromKeyString(string: string): Option<Key> {
  return fromKeyboardEvent({ key: string });
}

export function fromKeyboardEvent(event: { key: string, shiftKey?: boolean, ctrlKey?: boolean }): Option<Key> {
  const basicKey: Option<Exclude<KeyK, KeyK.AllowedCharacter>> = (() => {
    switch (event.key) {
    case 'ArrowLeft': return some(KeyK.ArrowLeft);
    case 'ArrowRight': return some(KeyK.ArrowRight);
    case 'ArrowUp': return some(KeyK.ArrowUp);
    case 'ArrowDown': return some(KeyK.ArrowDown);
    case ' ': return some(KeyK.Space);
    case 'Tab': return !event.shiftKey
      ? some(KeyK.Tab)
      : some(KeyK.ShiftTab);
    case 'Enter': return some(KeyK.Enter);
    case 'Backspace': return some(KeyK.Backspace);
    case 'Delete': return some(KeyK.Delete);
    case 'Escape': return some(KeyK.Escape);
    case '`': return some(KeyK.Backtick);
    case '.': return some(KeyK.Dot);
    case '!': return !event.ctrlKey
      ? some(KeyK.Exclamation)
      : some(KeyK.CtrlExclamation);
    case '@': return !event.ctrlKey
      ? some(KeyK.AtSign)
      : some(KeyK.CtrlAtSign);
    case '#': return !event.ctrlKey
      ? some(KeyK.Hash)
      : some(KeyK.CtrlHash);
    case 'Pause': return some(KeyK.Pause);
    // Keys specific to on-screen keyboard
    case '{num}': return some(KeyK.NumLayout);
    case '{abc}': return some(KeyK.AbcLayout);
    case '{dir}': return some(KeyK.Direction);
    case '{next}': return some(KeyK.Next);
    case '{prev}': return some(KeyK.Prev);
    case '{nextEntry}': return some(KeyK.NextEntry);
    case '{prevEntry}': return some(KeyK.PrevEntry);
    case '{bksp}': return some(KeyK.OskBackspace);
    case '{rebus}': return some(KeyK.Rebus);
    case '{block}': return some(KeyK.Block);
    default: return none;
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
