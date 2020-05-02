import * as t from "io-ts";

// We import this instead of defining it here so that we can define it
// differently for the main react app and the 'functions' subdirectory
import { timestamp } from '../timestamp';
export { timestamp } from '../timestamp';

const DBPuzzleMandatoryV = t.type({
  /** created at */
  ca: timestamp,
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

export const TimestampedPuzzleV = downloadTimestamped(DBPuzzleV);
export type TimestampedPuzzleT = t.TypeOf<typeof TimestampedPuzzleV>;

export const PlayV = t.type({
  /** crossword id */
  c: t.string,
  /** user id */
  u: t.string,
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

export function downloadTimestamped<A>(type: t.Type<A>) {
  return t.type({
    downloadedAt: timestamp,
    data: type,
  });
};

export function getDateString(pd: Date) {
  return pd.getUTCFullYear() + "-" + pd.getUTCMonth() + "-" + pd.getUTCDate();
}

export function prettifyDateString(dateString: string) {
  const groups = dateString.match(/^(\d+)-(\d+)-(\d+)$/);
  if (!groups) {
    throw new Error("Bad date string: " + dateString);
  }
  return (parseInt(groups[2]) + 1) + '/' + parseInt(groups[3]) + '/' + groups[1];
}

export const PuzzleStatsV = t.type({
  /** author id, denormalized for security rules purposes. */
  a: t.string,
  /** updated at */
  ua: timestamp,
  /** total completions */
  n: t.number,
  /** total completions without cheats */
  s: t.number,
  /** total time spent on puzzle, in fractional seconds */
  nt: t.number,
  /** total time spent by those w/o cheats */
  st: t.number,
  /** total play time of last update to each cell, in fractional seconds */
  ct: t.array(t.number),
  /** total update iteration count for each cell */
  uc: t.array(t.number),
});
export type PuzzleStatsT = t.TypeOf<typeof PuzzleStatsV>;

export const DailyStatsV = t.type({
  /** updated at */
  ua: timestamp,
  /** total completions */
  n: t.number,
  /** user ids with completions */
  u: t.array(t.string),
  /** completions by puzzleId */
  c: t.record(t.string, t.number),
  /** completions by hour (as UTC 0-23) */
  h: t.array(t.number),
});
export type DailyStatsT = t.TypeOf<typeof DailyStatsV>;

export const CronStatusV = t.type({
  ranAt: timestamp,
});
export type CronStatusT = t.TypeOf<typeof CronStatusV>;

/** created at, title */
const AuthoredPuzzleV = t.tuple([timestamp, t.string])
export type AuthoredPuzzleT = t.TypeOf<typeof AuthoredPuzzleV>;

/** keys are puzzle ids */
export const AuthoredPuzzlesV = t.record(t.string, AuthoredPuzzleV);

/** updated at, play time in fractional seconds, did cheat?, completed?, title */
const UserPlayV = t.tuple([timestamp, t.number, t.boolean, t.boolean, t.string])
export type UserPlayT = t.TypeOf<typeof UserPlayV>;

/** keys are puzzle ids */
export const UserPlaysV = t.record(t.string, UserPlayV);
export type UserPlaysT = t.TypeOf<typeof UserPlaysV>;

/** date string -> puzzle id */
export const CategoryIndexV = t.record(t.string, t.string);
export type CategoryIndexT = t.TypeOf<typeof CategoryIndexV>;
