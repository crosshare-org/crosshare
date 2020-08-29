import * as t from 'io-ts';
import type { WordDBT } from './WordDB';

import { DBPuzzleT, CommentWithRepliesT } from '../lib/dbtypes';
import { ConstructorPageT } from '../lib/constructorPage';

export type Optionalize<T extends K, K> = Omit<T, keyof K>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const BLOCK = '.';

export enum Direction {
  Across,
  Down
}

export interface WorkerMessage {
  type: string,
}
export interface AutofillResultMessage extends WorkerMessage {
  type: 'autofill-result',
  input: string[],
  result: string[]
}
export function isAutofillResultMessage(msg: WorkerMessage): msg is AutofillResultMessage {
  return msg.type === 'autofill-result';
}
export interface AutofillCompleteMessage extends WorkerMessage {
  type: 'autofill-complete',
}
export function isAutofillCompleteMessage(msg: WorkerMessage): msg is AutofillCompleteMessage {
  return msg.type === 'autofill-complete';
}
export interface LoadDBMessage extends WorkerMessage {
  type: 'loaddb',
  db: WordDBT,
}
export function isLoadDBMessage(msg: WorkerMessage): msg is LoadDBMessage {
  return msg.type === 'loaddb';
}
export interface CancelAutofillMessage extends WorkerMessage {
  type: 'cancel'
}
export function isCancelAutofillMessage(msg: WorkerMessage): msg is CancelAutofillMessage {
  return msg.type === 'cancel';
}
export interface AutofillMessage extends WorkerMessage {
  type: 'autofill',
  grid: string[],
  width: number,
  height: number
}
export function isAutofillMessage(msg: WorkerMessage): msg is AutofillMessage {
  return msg.type === 'autofill';
}

export interface Position {
  row: number,
  col: number,
}

export interface PosAndDir extends Position {
  dir: Direction,
}

const PuzzleJsonMandatoryV = t.type({
  title: t.string,
  size: t.type({
    rows: t.number,
    cols: t.number
  }),
  clues: t.type({
    across: t.array(t.string),
    down: t.array(t.string)
  }),
  grid: t.array(t.string)
});
const PuzzleJsonOptionalV = t.partial({
  highlighted: t.array(t.number),
  highlight: t.keyof({ circle: null, shade: null }),
});
export const PuzzleJsonV = t.intersection([PuzzleJsonMandatoryV, PuzzleJsonOptionalV]);
export type PuzzleJson = t.TypeOf<typeof PuzzleJsonV>;

export interface ClueT {
  num: number,
  dir: 0 | 1,
  clue: string,
}

export interface Comment {
  /** comment text */
  commentText: string,
  /** author id */
  authorId: string,
  /** author display name */
  authorDisplayName: string,
  /** author username */
  authorUsername?: string,
  /** author solve time in fractional seconds */
  authorSolveTime: number,
  /** author did cheat? */
  authorCheated: boolean,
  /** comment publish timestamp in millis since epoch*/
  publishTime: number
  /** comment id */
  id: string,
  /** replies */
  replies?: Array<Comment>
}

export interface PuzzleT {
  authorId: string,
  category: string | null,
  authorName: string,
  moderated: boolean,
  publishTime: number,
  title: string
  size: {
    rows: number,
    cols: number
  },
  clues: Array<ClueT>,
  grid: Array<string>,
  highlighted: Array<number>,
  highlight: 'circle' | 'shade',
  comments: Array<Comment>,
  constructorNotes: string | null,
}

export interface PuzzleResult extends PuzzleT {
  id: string
}

// This is kind of a hack but it helps us to ensure we only query for constructorPages on server side
export interface ServerPuzzleResult extends PuzzleResult {
  constructorPage: ConstructorPageT | null
}

function convertComments(comments: Array<CommentWithRepliesT>): Array<Comment> {
  return comments.map(c => {
    return {
      commentText: c.c,
      authorId: c.a,
      authorDisplayName: c.n,
      authorSolveTime: c.t,
      authorCheated: c.ch,
      publishTime: c.p.toMillis(),
      id: c.i,
      replies: convertComments(c.r || []),
      ...c.un && { authorUsername: c.un },
    };
  });
}

export function puzzleFromDB(dbPuzzle: DBPuzzleT): PuzzleT {
  const clues: Array<ClueT> = [];
  for (let i = 0; i < dbPuzzle.ac.length; i += 1) {
    clues.push({ dir: Direction.Across, clue: dbPuzzle.ac[i], num: dbPuzzle.an[i] });
  }
  for (let i = 0; i < dbPuzzle.dc.length; i += 1) {
    clues.push({ dir: Direction.Down, clue: dbPuzzle.dc[i], num: dbPuzzle.dn[i] });
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
      cols: dbPuzzle.w
    },
    clues: clues,
    grid: dbPuzzle.g,
    highlighted: dbPuzzle.hs || [],
    highlight: dbPuzzle.s ? 'shade' : 'circle',
    comments: convertComments(dbPuzzle.cs || []),
    constructorNotes: dbPuzzle.cn || null,
  };
}

export const PuzzleInProgressV = t.type({
  width: t.number,
  height: t.number,
  grid: t.array(t.string),
  highlighted: t.array(t.number),
  highlight: t.keyof({ circle: null, shade: null }),
  title: t.union([t.string, t.null]),
  clues: t.record(t.string, t.string),
  notes: t.union([t.string, t.null])
});
export type PuzzleInProgressT = t.TypeOf<typeof PuzzleInProgressV>;
