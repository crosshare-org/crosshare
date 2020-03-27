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
  bitmap: BigInteger|null,
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
function minCost(length: number, bitmap: BigInteger|null) {
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

function matchingBitmap(pattern:string) {
  let matches = null;
  for (let idx = 0; idx < pattern.length; idx += 1) {
    const letter = pattern[idx];
    if (letter === '?' || letter === ' ') {
      continue;
    }
    const bitmap = db.bitmaps[pattern.length + letter + idx];
    if (matches === null) {
      matches = bitmap;
    } else {
      matches = matches.and(bitmap);
    }
  }
  return matches;
}

// @ts-ignore TODO
class Grid {
  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly usedWords: Set<string>,
    public readonly cells: string[],
    public readonly entriesByCell: Array<[[number,number], [number,number]]>,
    public readonly entries: Entry[]
  ) {}

  /* Get a lower bound on total cost of the grid as filled in. */
  minCost() {
    let cost = 0;
    this.entries.forEach((e) => cost += e.minCost);
    return cost;
  }

  /**
   * Given an entry, get the crossing entries.
   *
   * Returns an array of (entry index, letter idx w/in that entry) of crosses.
   */
  crosses(entry:Entry) {
    const crossDir = (entry.direction === Direction.Across) ? Direction.Down : Direction.Across;
    const crosses: Array<[number, number]> = [];
    entry.cells.forEach((cellIndex) => {
      crosses.push(this.entriesByCell[cellIndex][crossDir]);
    })
    return crosses;
  }

  gridWithEntryDecided(entryIndex: number, word: string) {
    const newGrid = new Grid(
      this.width, this.height,
      new Set(this.usedWords),
      this.cells.slice(),
      this.entriesByCell,
      this.entries.slice());

    const entry = newGrid.entries[entryIndex];
    newGrid.usedWords.add(word);
    const crosses = newGrid.crosses(entry);
    for (let i = 0; i < word.length; i += 1) {
      const currentVal = newGrid.cells[entry.cells[i]];
      if (currentVal !== ' ') {
        if (currentVal === word[i]) {
          continue;  // No change needed for this cell
        } else {
          throw new Error("Cell has conflicting value: " + currentVal + ',' + word + ',' + i);
        }
      }

      // update cells
      newGrid.cells[entry.cells[i]] = word[i];

      // update crossing entries
      const cross = newGrid.entries[crosses[i][0]];
      let crossWord = '';
      cross.cells.forEach((cid) => {
        crossWord += newGrid.cells[cid];
      });
      const crossBitmap = updateBitmap(cross.cells.length, cross.bitmap, crosses[i][1], word[i]);

      if (crossBitmap.equals(ZERO)) {  // empty bitmap means invalid grid
        return null;
      }

      let crossCompleted = false;
      if (crossWord.indexOf(' ') === -1) {
        crossCompleted = true
        newGrid.usedWords.add(crossWord);
      }

      newGrid.entries[crosses[i][0]] = {
        index: cross.index,
        direction: cross.direction,
        cells: cross.cells,
        bitmap: crossBitmap,
        isComplete: crossCompleted,
        minCost: minCost(cross.cells.length, crossBitmap)
      };
    }

    // update entry itself
    const newBitmap = matchingBitmap(word);
    newGrid.entries[entryIndex] = {
      index: entry.index,
      direction: entry.direction,
      cells: entry.cells,
      bitmap: newBitmap,
      isComplete: true,
      minCost: minCost(word.length, newBitmap)
    }

    return newGrid;
  }

  stableSupsets(prelimSubset: Set<number>|null) {
    let that = this;
    let openEntries = this.entries.filter((e) => !e.isComplete);
    if (prelimSubset !== null) {
      openEntries = openEntries.filter((e) => prelimSubset.has(e.index))
    }

    const assignments = new Map<number, number>()

    function addSubset(entry:Entry, num:number) {
      if (assignments.has(entry.index)) {
        return;
      }
      if (prelimSubset !== null && !prelimSubset.has(entry.index)) {
        throw new Error("Bad assignment " + entry.index + ":" + prelimSubset);
      }
      assignments.set(entry.index, num);
      that.crosses(entry).forEach((c) => {
        const cross = that.entries[c[0]];
        if (that.cells[cross.cells[c[1]]] === ' ') {
          addSubset(cross, num);
        }
      });
    }

    let subsetNumber = 0;
    openEntries.forEach((e) => {
      addSubset(e, subsetNumber);
      subsetNumber += 1;
    });

    const inv = new Map<number, Set<number>>();
    assignments.forEach((val,key) => {
      const newVal = inv.get(val) || new Set<number>();
      newVal.add(key);
      inv.set(val, newVal);
    });
    return Array.from(inv.values());
  }

  toString() {
    let s = ""
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        s += this.cells[y * this.width + x] + " ";
      }
      s += "\n";
    }
    return s;
  }

  static fromTemplate(template: string[], width: number, height: number) {
      const usedWords = new Set<string>();
      const cells = template.map((c) => c.toUpperCase().replace("#", ".")) ;

      // [(across_entry, char_idx), (down_entry, char_idx)] index into entries array for each cell
      const entriesByCell: Array<[[number,number], [number,number]]> = [];
      cells.forEach(() => {
        entriesByCell.push([[0,0], [0,0]]);
      })

      const entries: Array<Entry> = [];

      [Direction.Across, Direction.Down].forEach(dir => {
        const xincr = (dir === Direction.Across) ? 1 : 0;
        const yincr = (dir === Direction.Down) ? 1 : 0;
        const iincr = xincr + yincr * width;
        let i = 0;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const isStartOfRow = (dir === Direction.Across && x === 0) ||
              (dir === Direction.Down && y === 0);
            const isStartOfEntry = (cells[i] !== '.' &&
              (isStartOfRow || cells[i-iincr] === '.') &&
              (x + xincr < width && y + yincr < height && cells[i+iincr] !== '.'));

            i += 1;
            if (!isStartOfEntry) {
              continue;
            }

            const entryCells: number[] = [];
            let entryPattern = "";
            let isComplete = true;
            let xt = x;
            let yt = y;
            let wordlen = 0;
            while (xt < width && yt < height) {
              const cellId = yt * width + xt;
              const cellVal = cells[cellId];
              entriesByCell[cellId][dir] = [entries.length, wordlen];
              if (cellVal === '.') {
                break;
              }
              if (cellVal === ' ') {
                isComplete = false;
              }
              entryCells.push(cellId);
              entryPattern += cellVal;
              xt += xincr;
              yt += yincr;
              wordlen += 1;
            }
            const entryBitmap = matchingBitmap(entryPattern);
            if (isComplete) {
              usedWords.add(entryPattern);
            }
            entries.push({
              index: entries.length,
              direction: dir,
              cells: entryCells,
              bitmap: entryBitmap,
              isComplete: isComplete,
              minCost: minCost(wordlen, entryBitmap)
            });
          }
        }
      });

    return new this(width, height, usedWords, cells, entriesByCell, entries);
  }
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
