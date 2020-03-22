import * as t from "io-ts";

export const BLOCK = ".";

export enum Direction {
  Across,
  Down
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
