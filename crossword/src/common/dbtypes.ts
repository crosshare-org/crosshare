import * as t from "io-ts";

// We import this instead of defining it here so that we can define it
// differently for the main react app and the 'functions' subdirectory
import { timestamp } from '../timestamp';
export { timestamp } from '../timestamp';

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

// from https://github.com/gcanti/io-ts/blob/master/test/helpers.ts
function withDefault<T extends t.Mixed>(
  type: T,
  defaultValue: t.TypeOf<T>
): t.Type<t.TypeOf<T>, t.TypeOf<T>, unknown> {
  return new t.Type(
    `withDefault(${type.name}, ${JSON.stringify(defaultValue)})`,
    type.is,
    (v) => type.decode(v != null ? v : defaultValue), // tslint:disable-line
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

export function downloadTimestamped<T extends t.Mixed>(type: T) {
  return t.type({
    downloadedAt: timestamp,
    data: type,
  });
};

export function getDateString(pd: Date) {
  return pd.getUTCFullYear() + "-" + pd.getUTCMonth() + "-" + pd.getUTCDate();
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
