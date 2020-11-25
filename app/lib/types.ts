import * as t from 'io-ts';
import type { WordDBT } from './WordDB';

import { DBPuzzleT, CommentWithRepliesT } from '../lib/dbtypes';
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

export interface Comment {
  /** comment text */
  commentText: string;
  /** author id */
  authorId: string;
  /** author display name */
  authorDisplayName: string;
  /** author username */
  authorUsername?: string;
  /** author solve time in fractional seconds */
  authorSolveTime: number;
  /** author did cheat? */
  authorCheated: boolean;
  /** comment publish timestamp in millis since epoch*/
  publishTime: number;
  /** comment id */
  id: string;
  /** replies */
  replies?: Array<Comment>;
}

export interface PuzzleT {
  authorId: string;
  category: string | null;
  authorName: string;
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
  comments: Array<Comment>;
  constructorNotes: string | null;
  blogPost: string | null;
  isPrivate: boolean;
  isPrivateUntil: number | null;
}

export interface PuzzleResult extends PuzzleT {
  id: string;
}

// This is kind of a hack but it helps us to ensure we only query for constructorPages on server side
export interface ServerPuzzleResult extends PuzzleResult {
  constructorPage: ConstructorPageT | null;
}

function convertComments(comments: Array<CommentWithRepliesT>): Array<Comment> {
  return comments.map((c) => {
    return {
      commentText: c.c,
      authorId: c.a,
      authorDisplayName: c.n,
      authorSolveTime: c.t,
      authorCheated: c.ch,
      publishTime: c.p.toMillis(),
      id: c.i,
      replies: convertComments(c.r || []),
      ...(c.un && { authorUsername: c.un }),
    };
  });
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
    comments: convertComments(dbPuzzle.cs || []),
    constructorNotes: dbPuzzle.cn || null,
    blogPost: dbPuzzle.bp || null,
    isPrivate: dbPuzzle.pv || false,
    isPrivateUntil: dbPuzzle.pvu ? dbPuzzle.pvu.toMillis() : null,
  };
}

export const PuzzleInProgressV = t.intersection([
  t.type({
    width: t.number,
    height: t.number,
    grid: t.array(t.string),
    highlighted: t.array(t.number),
    highlight: t.keyof({ circle: null, shade: null }),
    title: t.union([t.string, t.null]),
    clues: t.record(t.string, t.string),
    notes: t.union([t.string, t.null]),
  }),
  t.partial({
    id: t.string,
    isPrivate: t.boolean,
    isPrivateUntil: t.union([t.number, t.null]),
    explanations: t.record(t.string, t.string),
  }),
]);
export type PuzzleInProgressT = t.TypeOf<typeof PuzzleInProgressV>;
