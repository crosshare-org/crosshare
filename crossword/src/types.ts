import * as t from "io-ts";
import { either } from 'fp-ts/lib/Either'
import { WordDBT } from './WordDB';

declare var firebase: typeof import('firebase');

export const BLOCK = ".";

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
export interface AutofillMessage extends WorkerMessage {
  type: 'autofill',
  grid: string[],
  width: number,
  height: number
}
export function isAutofillMessage(msg: WorkerMessage): msg is AutofillMessage {
  return msg.type === 'autofill'
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
  highlight: t.keyof({circle: null, shade: null})
});
export const PuzzleJsonV = t.intersection([PuzzleJsonMandatoryV, PuzzleJsonOptionalV]);
export type PuzzleJson = t.TypeOf<typeof PuzzleJsonV>;

const isFirestoreTimestamp = (u: unknown): u is firebase.firestore.Timestamp =>
  u ? u instanceof firebase.firestore.Timestamp : false;

const validateTimestamp: t.Validate<unknown, firebase.firestore.Timestamp> = (i, c) => {
  if (isFirestoreTimestamp(i)) {
    return t.success(i);
  }
  return either.chain(
    t.type({seconds: t.number, nanoseconds: t.number}).validate(i, c),
    obj => t.success(new firebase.firestore.Timestamp(obj.seconds, obj.nanoseconds))
  );
}

const timestamp = new t.Type<firebase.firestore.Timestamp>(
  'Timestamp',
  isFirestoreTimestamp,
  validateTimestamp,
  t.identity,
);

const ClueV = t.type({
  num: t.number,
  dir: t.union([t.literal(0), t.literal(1)]),
  clue: t.string,
});
export type ClueT = t.TypeOf<typeof ClueV>;

export const PuzzleV = t.type({
  authorId: t.string,
  category: t.union([t.string, t.null]),
  authorName: t.string,
  moderated: t.boolean,
  publishTime: t.union([timestamp, t.null]),
  title: t.string,
  size: t.type({
    rows: t.number,
    cols: t.number
  }),
  clues: t.array(ClueV),
  grid: t.array(t.string),
  highlighted: t.array(t.number),
  highlight: t.keyof({circle: null, shade: null})
});

export type PuzzleT = t.TypeOf<typeof PuzzleV>;
export type PuzzleResult = PuzzleT & {id: string};

export function puzzleTitle(puzzle: PuzzleT) {
  let title = puzzle.title;
  if (puzzle.category === 'dailymini' && puzzle.publishTime) {
    title = "Daily Mini for " + puzzle.publishTime.toDate().toLocaleDateString();
  }
  return title;
}

const DBPuzzleMandatoryV = t.type({
  /** author's user id */
  a: t.string,
  /** author's display name */
  n: t.string,
  /** category */
  c: t.union([t.string, t.null]),
  /** is this puzzle moderated? */
  m: t.boolean,
  /** timestamp when the puzzle goes live */
  p: t.union([timestamp, t.null]),
  /** title */
  t: t.string,
  /** grid width / columns */
  w: t.number,
  /** grid height / rows */
  h: t.number,
  /** across clue strings */
  ac: t.array(t.string),
  /** across clue display numbers */
  an: t.array(t.number),
  /** down clue strings */
  dc: t.array(t.string),
  /** down clue display numbers */
  dn: t.array(t.number),
  /** grid (solution) */
  g: t.array(t.string),
});
const DBPuzzleOptionalV = t.partial({
  /** highlighted cell indexes */
  hs: t.array(t.number),
  /** use shade instead of circle for highlight? */
  s: t.boolean,
});
export const DBPuzzleV = t.intersection([DBPuzzleMandatoryV, DBPuzzleOptionalV]);
export type DBPuzzleT = t.TypeOf<typeof DBPuzzleV>;

export function puzzleFromDB(dbPuzzle: DBPuzzleT): PuzzleT {
  let clues: Array<ClueT> = [];
  for (let i = 0; i < dbPuzzle.ac.length; i += 1) {
    clues.push({dir: Direction.Across, clue: dbPuzzle.ac[i], num: dbPuzzle.an[i]});
  }
  for (let i = 0; i < dbPuzzle.dc.length; i += 1) {
    clues.push({dir: Direction.Down, clue: dbPuzzle.dc[i], num: dbPuzzle.dn[i]});
  }
  return {
    authorId: dbPuzzle.a,
    category: dbPuzzle.c,
    authorName: dbPuzzle.n,
    moderated: dbPuzzle.m,
    publishTime: dbPuzzle.p,
    title: dbPuzzle.t,
    size: {
      rows: dbPuzzle.h,
      cols: dbPuzzle.w
    },
    clues: clues,
    grid: dbPuzzle.g,
    highlighted: dbPuzzle.hs || [],
    highlight: dbPuzzle.s ? "shade" : "circle"
  };
}

// from https://github.com/gcanti/io-ts/blob/master/test/helpers.ts
function withDefault<T extends t.Mixed>(
  type: T,
  defaultValue: t.TypeOf<T>
): t.Type<t.TypeOf<T>, t.TypeOf<T>, unknown> {
  return new t.Type(
    `withDefault(${type.name}, ${JSON.stringify(defaultValue)})`,
    type.is,
    (v) => type.decode(v != null ? v : defaultValue),
    type.encode
  )
}

export const PlayV = t.type({
  /** crossword id */
  c: t.string,
  /** user id */
  u: t.string,
  /** crossword title TODO remove this if we cache it w/ recent plays on user doc */
  n: withDefault(t.string, "Crossword"),
  /** updated at */
  ua: timestamp,
  /** filled in grid */
  g: t.array(t.string),
  /** play time of last update to each cell, in fractional seconds */
  ct: t.array(t.number),
  /** update iteration count per cell */
  uc: t.array(t.number),
  /** list of (checked) correct cells */
  vc: t.array(t.number),
  /** list of (checked) wrong cells */
  wc: t.array(t.number),
  /** list of cells ever marked wrong */
  we: t.array(t.number),
  /** list of revealed cells */
  rc: t.array(t.number),
  /** total play time, in fractional seconds */
  t: t.number,
  /** did "cheat"? */
  ch: t.boolean,
  /** finished the puzzle? */
  f: t.boolean,
});

export type PlayT = t.TypeOf<typeof PlayV>;
