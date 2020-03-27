import { WordDBTransformed } from './WordDB';
import { BigInteger } from '@modern-dev/jsbn';
import { Direction } from './types';

let db: WordDBTransformed;
export function setDb(newdb:WordDBTransformed) {
  db = newdb;
}

const ONE = new BigInteger('1', 10);
const ZERO = new BigInteger('0', 10);

interface Entry {
  index: number,
  direction: Direction,
  cells: number[],
  bitmap: number,
  isComplete: boolean,
  minCost: number
}

function highestScore(length: number, bitmap: BigInteger|null) {
  const words = db.words[length];
  if (bitmap === null) {
    return words[words.length - 1];
  }
  return words[bitmap.bitLength() - 1];
}

/**
 * Get minimum cost of the words encoded by `bitmap`.
 */
function minCost(length: number, bitmap: BigInteger) {
  const match = highestScore(length, bitmap);
  if (match) {
    return 1 / match[1]
  }
  return 5
}

function updateBitmap(length:number, bitmap:BigInteger|null, index:number, letter:string) {
  const match = db.bitmaps[length + letter + index];
  if (bitmap === null) {
    return match
  }
  return bitmap.and(match);
}

function activebits(a:BigInteger) {
  const active: number[] = [];
  while (!a.equals(ZERO)) {
    const b = a.bitLength() - 1
    active.push(b)
    a = a.subtract(ONE.shiftLeft(b));
  }
  return active
}

// TODO cache!! @functools.lru_cache(maxsize=None)
function matchingWords(length:number, bitmap:BigInteger|null) {
  if (bitmap === null) {
    return db.words[length].slice();
  }
  const active = activebits(bitmap)
  return active.map((i) => db.words[length][i]);
}

const memo:Record<string, string[]> = {}
export class Autofiller {
  public currentIter: number;
  public completed: boolean;
  public stringified: string;

  constructor(public readonly grid: string[], public onComplete: (input: string[], result: string[]) => void) {
    this.stringified = this.grid.join('|');
    this.currentIter = 0;
    this.completed = false;
  }
  solution() {
    if (this.currentIter === 0) {
      if (memo[this.stringified]) {
        return memo[this.stringified];
      }
    }
    if (this.currentIter === 20) {
      const solution = this.grid.map((cell) => cell.trim() !== "" ? cell : String.fromCharCode(65+Math.floor(Math.random() * 26)));
      memo[this.stringified] = solution;
      return solution;
    }
    return null;
  }
  step() {
    if (!db) {
      console.error("Worker has no db but attempting autofill");
      this.completed = true;
      return;
    }
    let bitmap = updateBitmap(15, null, 0, "M")
    bitmap = updateBitmap(15, bitmap, 1, "O")
    bitmap = updateBitmap(15, bitmap, 2, "D")
    console.log(matchingWords(15, bitmap))

    const solution = this.solution();
    if (solution) {
      this.onComplete(this.grid, solution);
      this.completed = true;
      return;
    }

    var start = Date.now(),
    now = start;
    while (now - start < 100) {
      now = Date.now();
    }
    this.currentIter += 1;
  }
}
