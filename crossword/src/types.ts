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

export interface PuzzleJson {
  author: string,
  title: string,
  size: {rows: number, cols: number},
  clues: {across: Array<string>, down: Array<string>},
  grid: Array<string>
}
