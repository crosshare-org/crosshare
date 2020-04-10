import * as t from "io-ts";
import { either } from 'fp-ts/lib/Either'
import { WordDBT } from './WordDB';
import firebase from 'firebase/app';

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
