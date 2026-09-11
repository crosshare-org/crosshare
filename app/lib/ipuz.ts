import {
  ALLOWABLE_GRID_CHARS,
  BLOCK,
  ClueT,
  EMPTY,
  PuzzleInProgressStrictT,
} from './types.js';
import { fromCells, getClueMap } from './viewableGrid.js';

export type IpuzExportable = {
  w: number;
  h: number;
  ac: string[];
  an: number[];
  dc: string[];
  dn: number[];
  g: string[];
  n: string;
  t: string;
  sty?: Record<string, number[]>;
  cn?: string;
  gc?: string;
  hdn?: number[];
  vb?: number[];
  hb?: number[];
};

const MIN_DIM = 2;
const MAX_DIM = 25;
const DEFAULT_BLOCK = '#';
const DEFAULT_EMPTY = 0;

type IpuzStyle = {
  shapebg?: string;
  barred?: string;
  hidden?: boolean;
};

type IpuzCellObject = {
  cell?: unknown;
  value?: unknown;
  style?: IpuzStyle;
};

type IpuzCell = string | number | null | IpuzCellObject;

type IpuzClueObject = {
  number?: string | number;
  label?: string | number;
  clue?: string;
  text?: string;
  explanation?: string;
};

type IpuzClue = string | [string | number, string] | IpuzClueObject;

type IpuzFile = {
  version?: unknown;
  kind?: unknown;
  title?: unknown;
  author?: unknown;
  copyright?: unknown;
  publisher?: unknown;
  notes?: unknown;
  intro?: unknown;
  block?: unknown;
  empty?: unknown;
  dimensions?: { width?: unknown; height?: unknown };
  puzzle?: unknown;
  solution?: unknown;
  clues?: unknown;
};

function decodeUtf8(bytes: Uint8Array): string {
  let start = 0;
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    start = 3;
  }
  return new TextDecoder('utf-8').decode(bytes.slice(start));
}

function unwrapIpuzJson(text: string): string {
  const trimmed = text.trim();
  const jsonp = trimmed.match(/^ipuz\s*\(\s*([\s\S]*)\s*\)\s*;?\s*$/i);
  return jsonp?.[1]?.trim() ?? trimmed;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseIpuzJson(text: string): unknown {
  return JSON.parse(unwrapIpuzJson(text)) as unknown;
}

export function isIpuzText(text: string): boolean {
  try {
    return isIpuzObject(parseIpuzJson(text));
  } catch {
    return false;
  }
}

export function isIpuz(bytes: Uint8Array): boolean {
  try {
    return isIpuzText(decodeUtf8(bytes));
  } catch {
    return false;
  }
}

function isIpuzObject(data: unknown): data is IpuzFile {
  const obj = asRecord(data);
  if (!obj) {
    return false;
  }
  const version = obj.version;
  if (typeof version === 'string' && version.includes('ipuz.org')) {
    return true;
  }
  const kind = obj.kind;
  return (
    Array.isArray(kind) &&
    kind.some((k) => typeof k === 'string' && k.includes('ipuz.org'))
  );
}

function isCrosswordKind(kind: unknown): boolean {
  if (!Array.isArray(kind) || kind.length === 0) {
    return true;
  }
  return kind.some(
    (k) => typeof k === 'string' && /ipuz\.org\/crossword/i.test(k)
  );
}

function copyrighted(ipuz: IpuzFile): boolean {
  return [ipuz.copyright, ipuz.publisher, ipuz.title, ipuz.notes, ipuz.intro]
    .filter((v): v is string => typeof v === 'string')
    .some((v) => v.includes('New York Times'));
}

function blockChar(ipuz: IpuzFile): string {
  return typeof ipuz.block === 'string' && ipuz.block.length > 0
    ? ipuz.block
    : DEFAULT_BLOCK;
}

function emptyMarker(ipuz: IpuzFile): string | number {
  return ipuz.empty === undefined
    ? DEFAULT_EMPTY
    : (ipuz.empty as string | number);
}

function isBlockValue(value: unknown, block: string): boolean {
  return value === block || value === '#' || value === '.';
}

function isEmptyValue(value: unknown, empty: string | number): boolean {
  return (
    value === empty ||
    value === '' ||
    value === ':' ||
    value === 0 ||
    value === null ||
    value === undefined
  );
}

function cellObject(cell: IpuzCell | undefined): IpuzCellObject | null {
  return cell !== null && typeof cell === 'object' && !Array.isArray(cell)
    ? cell
    : null;
}

function puzzleCellValue(cell: IpuzCell | undefined): unknown {
  const obj = cellObject(cell);
  if (obj) {
    return obj.cell !== undefined ? obj.cell : obj.value;
  }
  return cell;
}

function solutionCellValue(cell: IpuzCell | undefined): unknown {
  const obj = cellObject(cell);
  if (obj) {
    return obj.value !== undefined ? obj.value : obj.cell;
  }
  return cell;
}

function cellStyle(cell: IpuzCell | undefined): IpuzStyle | undefined {
  return cellObject(cell)?.style;
}

function normalizeSolutionLetter(raw: string): string {
  const compact = raw.replace(/\s+/g, '');
  if (!compact) {
    return EMPTY;
  }
  const upper = compact.toUpperCase();
  if ([...upper].every((c) => ALLOWABLE_GRID_CHARS.test(c))) {
    return upper;
  }
  throw new Error(`Invalid character in grid: ${raw}`);
}

function gridLetterFromSolution(
  cell: IpuzCell | undefined,
  block: string,
  empty: string | number
): string {
  const value = solutionCellValue(cell);
  if (isBlockValue(value, block)) {
    return BLOCK;
  }
  if (isEmptyValue(value, empty) || value === undefined) {
    return EMPTY;
  }
  if (typeof value === 'number') {
    return normalizeSolutionLetter(String(value));
  }
  if (typeof value === 'string') {
    if (isBlockValue(value, block)) {
      return BLOCK;
    }
    if (isEmptyValue(value, empty)) {
      return EMPTY;
    }
    return normalizeSolutionLetter(value);
  }
  throw new Error('Invalid solution cell');
}

function isPuzzleBlock(
  cell: IpuzCell | undefined,
  block: string,
  empty: string | number
): boolean {
  const value = puzzleCellValue(cell);
  if (isEmptyValue(value, empty) || value === undefined) {
    return false;
  }
  return isBlockValue(value, block);
}

function requireGrid(
  value: unknown,
  width: number,
  height: number,
  label: string
): IpuzCell[][] {
  if (!Array.isArray(value)) {
    throw new Error(`ipuz ${label} must be a 2D array`);
  }
  if (value.length !== height) {
    throw new Error(`ipuz ${label} height does not match dimensions`);
  }
  return value.map((row, y) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error(`ipuz ${label} row ${y} does not match width`);
    }
    return row as IpuzCell[];
  });
}

function clueDirection(key: string): 0 | 1 | null {
  const normalized = key.toLowerCase();
  if (normalized === 'across' || normalized === 'a' || normalized === '0') {
    return 0;
  }
  if (normalized === 'down' || normalized === 'd' || normalized === '1') {
    return 1;
  }
  return null;
}

function parseClueNumber(clue: IpuzClue, fallback: number): number {
  if (Array.isArray(clue)) {
    const num = parseInt(String(clue[0]), 10);
    return Number.isFinite(num) ? num : fallback;
  }
  if (typeof clue === 'object' && clue) {
    const raw = clue.number ?? clue.label;
    if (raw !== undefined) {
      const num = parseInt(String(raw), 10);
      if (Number.isFinite(num)) {
        return num;
      }
    }
  }
  return fallback;
}

function parseClueText(clue: IpuzClue): string {
  if (typeof clue === 'string') {
    return clue;
  }
  if (Array.isArray(clue)) {
    return clue[1] ?? '';
  }
  return clue.clue ?? clue.text ?? '';
}

function parseClues(rawClues: unknown): ClueT[] {
  const clues: ClueT[] = [];
  const groups = asRecord(rawClues);
  if (!groups) {
    return clues;
  }
  for (const [key, value] of Object.entries(groups)) {
    const dir = clueDirection(key);
    if (dir === null || !Array.isArray(value)) {
      continue;
    }
    value.forEach((clue, i) => {
      clues.push({
        num: parseClueNumber(clue as IpuzClue, i + 1),
        dir,
        clue: parseClueText(clue as IpuzClue),
        explanation: null,
      });
    });
  }
  return clues;
}

function optionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function importIpuz(bytes: Uint8Array): PuzzleInProgressStrictT {
  return importIpuzText(decodeUtf8(bytes));
}

export function importIpuzText(text: string): PuzzleInProgressStrictT {
  const parsed = parseIpuzJson(text);
  if (!isIpuzObject(parsed)) {
    throw new Error('Not a valid ipuz file');
  }
  if (!isCrosswordKind(parsed.kind)) {
    throw new Error('Only crossword ipuz files are supported');
  }
  if (copyrighted(parsed)) {
    throw new Error('Cannot import copyrighted puzzles');
  }

  const width = Number(parsed.dimensions?.width);
  const height = Number(parsed.dimensions?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('ipuz file is missing dimensions');
  }
  if (width < MIN_DIM || height < MIN_DIM) {
    throw new Error('All grids must have at least 2 rows+cols for now');
  }
  if (width > MAX_DIM || height > MAX_DIM) {
    throw new Error('All grids must have max of 25 rows+cols for now');
  }

  const block = blockChar(parsed);
  const empty = emptyMarker(parsed);
  const puzzleGrid = parsed.puzzle
    ? requireGrid(parsed.puzzle, width, height, 'puzzle')
    : null;
  const solutionGrid = parsed.solution
    ? requireGrid(parsed.solution, width, height, 'solution')
    : null;
  if (!puzzleGrid && !solutionGrid) {
    throw new Error('ipuz file is missing a puzzle or solution grid');
  }

  const grid: string[] = [];
  const hidden: number[] = [];
  const circled: number[] = [];
  const vBars: number[] = [];
  const hBars: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const puzzleCell = puzzleGrid?.[y]?.[x];
      const solutionCell = solutionGrid?.[y]?.[x];
      const style = cellStyle(puzzleCell) ?? cellStyle(solutionCell);

      const isBlock = puzzleGrid
        ? isPuzzleBlock(puzzleCell, block, empty)
        : gridLetterFromSolution(solutionCell, block, empty) === BLOCK;

      if (isBlock) {
        grid.push(BLOCK);
        continue;
      }

      grid.push(
        solutionGrid
          ? gridLetterFromSolution(solutionCell, block, empty)
          : EMPTY
      );

      if (style?.hidden) {
        hidden.push(i);
      }
      if (style?.shapebg?.toLowerCase() === 'circle') {
        circled.push(i);
      }
      const barred = style?.barred?.toUpperCase() ?? '';
      if (barred.includes('R')) {
        vBars.push(i);
      }
      if (barred.includes('B')) {
        hBars.push(i);
      }
      if (barred.includes('L') && x > 0) {
        vBars.push(i - 1);
      }
      if (barred.includes('T') && y > 0) {
        hBars.push(i - width);
      }
    }
  }

  const viewableGrid = fromCells({
    cells: grid,
    width,
    height,
    allowBlockEditing: false,
    cellStyles: new Map<string, Set<number>>(),
    hidden: new Set(hidden),
    vBars: new Set(vBars),
    hBars: new Set(hBars),
    mapper: (e) => e,
  });

  const notes =
    (optionalString(parsed.notes) ?? optionalString(parsed.intro))
      ?.replace(/(- )?created (on|with) \w+\.(com|org|net)/i, '')
      .trim() || null;

  return {
    width,
    height,
    grid,
    title: optionalString(parsed.title),
    notes,
    clues: getClueMap(viewableGrid, parseClues(parsed.clues)),
    ...(circled.length && { cellStyles: { circle: circled } }),
    ...(hidden.length && { hidden }),
    ...(vBars.length && { vBars: [...new Set(vBars)] }),
    ...(hBars.length && { hBars: [...new Set(hBars)] }),
  };
}

function clueEntries(
  numbers: number[],
  texts: string[]
): { number: number; clue: string }[] {
  return numbers.map((number, i) => ({
    number,
    clue: texts[i] ?? '',
  }));
}

function startNumberMap(puzzle: IpuzExportable): Map<number, number> {
  const starts = new Map<number, number>();
  const width = puzzle.w;
  const grid = puzzle.g;
  const vBars = new Set(puzzle.vb ?? []);
  const hBars = new Set(puzzle.hb ?? []);

  const isBlock = (i: number | undefined) =>
    i === undefined || grid[i] === BLOCK;

  for (let i = 0; i < grid.length; i++) {
    if (isBlock(i)) {
      continue;
    }
    const col = i % width;
    const row = Math.floor(i / width);
    const startsAcross =
      (col === 0 || isBlock(i - 1) || vBars.has(i - 1)) &&
      col + 1 < width &&
      !isBlock(i + 1) &&
      !vBars.has(i);
    const startsDown =
      (row === 0 || isBlock(i - width) || hBars.has(i - width)) &&
      row + 1 < puzzle.h &&
      !isBlock(i + width) &&
      !hBars.has(i);
    if (startsAcross || startsDown) {
      starts.set(i, 0);
    }
  }

  let next = 1;
  for (let i = 0; i < grid.length; i++) {
    if (!starts.has(i)) {
      continue;
    }
    starts.set(i, next);
    next += 1;
  }
  return starts;
}

function barredStyle(
  index: number,
  width: number,
  vBars: Set<number>,
  hBars: Set<number>
): string {
  let barred = '';
  if (hBars.has(index - width)) {
    barred += 'T';
  }
  if (vBars.has(index)) {
    barred += 'R';
  }
  if (hBars.has(index)) {
    barred += 'B';
  }
  if (vBars.has(index - 1) && index % width !== 0) {
    barred += 'L';
  }
  return barred;
}

export function exportIpuz(puzzle: IpuzExportable): string {
  const width = puzzle.w;
  const height = puzzle.h;
  const vBars = new Set(puzzle.vb ?? []);
  const hBars = new Set(puzzle.hb ?? []);
  const hidden = new Set(puzzle.hdn ?? []);
  const circled = new Set(
    Object.entries(puzzle.sty ?? {})
      .filter(([style]) => style === 'circle')
      .flatMap(([, cells]) => cells)
  );
  const starts = startNumberMap(puzzle);

  const puzzleRows: IpuzCell[][] = [];
  const solutionRows: IpuzCell[][] = [];

  for (let y = 0; y < height; y++) {
    const puzzleRow: IpuzCell[] = [];
    const solutionRow: IpuzCell[] = [];
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const letter = puzzle.g[i] ?? EMPTY;
      if (letter === BLOCK) {
        puzzleRow.push(DEFAULT_BLOCK);
        solutionRow.push(DEFAULT_BLOCK);
        continue;
      }

      const style: IpuzStyle = {};
      if (circled.has(i)) {
        style.shapebg = 'circle';
      }
      const barred = barredStyle(i, width, vBars, hBars);
      if (barred) {
        style.barred = barred;
      }
      if (hidden.has(i)) {
        style.hidden = true;
      }

      const number = starts.get(i) ?? 0;
      const hasStyle = Object.keys(style).length > 0;
      puzzleRow.push(hasStyle ? { cell: number, style } : number);
      solutionRow.push(letter === EMPTY ? 0 : letter);
    }
    puzzleRows.push(puzzleRow);
    solutionRows.push(solutionRow);
  }

  let note = 'Created on crosshare.org';
  let author = puzzle.n;
  if (puzzle.gc) {
    author = puzzle.gc;
    note = `Published by ${puzzle.n} on crosshare.org`;
  }

  const ipuz = {
    version: 'http://ipuz.org/v2',
    kind: ['http://ipuz.org/crossword#1'],
    title: puzzle.t,
    author,
    copyright: `Copyright ${author}, all rights reserved`,
    notes: puzzle.cn ? `${puzzle.cn} - ${note}` : note,
    dimensions: { width, height },
    puzzle: puzzleRows,
    solution: solutionRows,
    clues: {
      Across: clueEntries(puzzle.an, puzzle.ac),
      Down: clueEntries(puzzle.dn, puzzle.dc),
    },
  };

  return `${JSON.stringify(ipuz, null, 2)}\n`;
}

export function exportIpuzFile(puzzle: IpuzExportable): Uint8Array {
  return new TextEncoder().encode(exportIpuz(puzzle));
}
