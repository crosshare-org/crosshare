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

const memoNumMatches:Map<string, number> = new Map();
function numMatches(length:number, bitmap:BigInteger|null) {
  const key:string = length + ":" + (bitmap === null ? 'null' : bitmap.toString(32));
  const memoed = memoNumMatches.get(key);
  if (memoed) {
    return memoed;
  }
  let rv;
  if (bitmap === null) {
    rv = db.words[length].length;
  } else {
    rv = bitmap.bitCount();
  }
  memoNumMatches.set(key, rv);
  return rv;
}

function numMatchesForEntry(entry: Entry) {
  return numMatches(entry.cells.length, entry.bitmap);
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

const memoMatchingWords:Map<string, [string, number][]> = new Map();
function matchingWords(length:number, bitmap:BigInteger|null) {
  const key:string = length + ":" + (bitmap === null ? 'null' : bitmap.toString(32));
  const memoed = memoMatchingWords.get(key);
  if (memoed) {
    return memoed;
  }
  let rv;
  if (bitmap === null) {
    rv = db.words[length].slice();
  } else {
    const active = activebits(bitmap)
    rv = active.map((i) => db.words[length][i]);
  }
  memoMatchingWords.set(key, rv);
  return rv;
}

const memoMatchingBitmap:Map<string, BigInteger|null> = new Map();
function matchingBitmap(pattern:string) {
  const memoed = memoMatchingBitmap.get(pattern);
  if (memoed) {
    return memoed;
  }
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
  memoMatchingBitmap.set(pattern, matches);
  return matches;
}

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

  stableSubsets(prelimSubset: Set<number>|null) {
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

enum ResultTag {
  Recur,
  Value
}
interface Result {
  type: ResultTag
}
interface Recur extends Result {
  type: ResultTag.Recur,
  grid: Grid,
  discrep: number,
  pitched: Set<string>,
  subset: Set<number>|null,
  cont: Cont
}
function isRecur(result: Result): result is Recur {
    return result.type === ResultTag.Recur;
}
function recur(grid:Grid, discrep:number, pitched:Set<string>, subset:Set<number>|null, cont:Cont): Recur {
  return {type: ResultTag.Recur, grid, discrep, pitched, subset, cont};
}
interface Value extends Result {
  type: ResultTag.Value,
  result: Grid|null
}
function isValue(result: Result): result is Value {
    return result.type === ResultTag.Value;
}
function value(x:Grid|null) {
  return {type: ResultTag.Value, result: x}
}

type Cont = (x: Grid|null) => Result;

export class Autofiller {
  public initialGrid: Grid;
  public completed: boolean;
  public solnGrid: Grid|null;
  public solnCost: number|null;
  public nextStep: Result;
  public postedSoln: boolean;
  public startTime: number;

  constructor(
    public readonly grid: string[],
    public readonly width: number,
    public readonly height: number,
    public onComplete: (input: string[], result: string[]) => void
  ) {
    this.initialGrid = Grid.fromTemplate(this.grid, this.width, this.height);
    this.completed = false;
    this.solnCost = null;
    this.solnGrid = null;
    this.postedSoln = false;
    this.startTime = new Date().getTime();

    // Our initial step is a call to recur
    this.nextStep = recur(this.initialGrid, 2, new Set<string>(), null, (result) => {return value(result)});
  };

  step() {
    if (!db) {
      console.error("Worker has no db but attempting autofill");
      this.completed = true;
      return;
    }
    if (this.completed) {
      console.log("Calling step but already completed");
      return;
    }

    /* Take as many steps as we can w/in 50ms. After that we need to take a
     * break so that we have a chance to get any new input from the user. */
    const start = new Date().getTime();
    while (isRecur(this.nextStep) && new Date().getTime() - start < 50) {
      this.nextStep = this._solve(
        this.nextStep.grid,
        this.nextStep.discrep,
        this.nextStep.pitched,
        this.nextStep.subset,
        this.nextStep.cont);
    }

    // If it's a "value" (not a "recur") we're done.
    if (isValue(this.nextStep)) {
      console.log("Finished: " + ((new Date().getTime() - this.startTime)/1000).toPrecision(4) + "s");
      this.completed = true;
    }

    // If we have a solution that hasn't been posted yet, post it.
    if (this.solnGrid && !this.postedSoln) {
      console.log("Posting soln");
      this.postedSoln = true;
      this.onComplete(this.grid, this.solnGrid.cells);
    }
  };

  /* Fill out a grid or a subset of a grid */
  _solve(grid: Grid, discrep: number, pitched: Set<string>, subset: Set<number>|null, cont: Cont): Result {
    const baseCost = grid.minCost();
    if (this.solnCost && baseCost > this.solnCost) {
      return cont(null);
    }

    let entriesToConsider = grid.entries.filter((e) => !e.isComplete);
    if (entriesToConsider.length === 0) {  // New best soln
      this.solnGrid = grid
      this.solnCost = baseCost
      this.postedSoln = false;
      return cont(grid)
    }

    if (subset !== null) {
      entriesToConsider = entriesToConsider.filter((e) => subset.has(e.index));
    }
    if (entriesToConsider.length === 0) {  // Done with this subsection
      return cont(grid);
    }

    const subsets = grid.stableSubsets(subset);
    if (subsets.length > 1) {
      subsets.sort((a,b) => a.size - b.size);
      return recur(grid, discrep, pitched, subsets[0], subsolved => {
        if (subsolved === null) {
          return cont(null);
        } else {
          return recur(subsolved, discrep, pitched, subset, cont);
        }
      });
    }

    entriesToConsider.sort((e1, e2) => numMatchesForEntry(e1) - numMatchesForEntry(e2));
    let successor: [Grid, number, string]|null = null;
    let successorDiff: number|null = null;

    for (const entry of entriesToConsider) {
      const length = entry.cells.length;
      const crosses = grid.crosses(entry)
      let bestGrid: [Grid, number, string]|null = null;
      let bestCost: number|null = null;
      let secondBestCost: number|null = null;

      let skipEntry = false;
      for (const [word, score] of matchingWords(length, entry.bitmap)) {
        if (pitched.has(entry.index + ":" + word)) {
          continue;
        }
        if (grid.usedWords.has(word)) {
          continue;
        }

        // If we have a secondBestCost for this entry we know it's lower than existing soln cost
        const costToBeat = secondBestCost !== null ? secondBestCost : this.solnCost;

        // Fail fast based on score change due to this entry alone
        if (costToBeat !== null && ((baseCost - entry.minCost + 1 / score) > costToBeat)) {
          continue;
        }

        // Fail fast based on score change due to any crosses
        let failFast = false;
        for (let i = 0; i < length; i += 1) {
          const cell = grid.cells[entry.cells[i]];
          if (cell !== ' ') {  // Don't need to check cross
            continue;
          }
          const cross = grid.entries[crosses[i][0]];
          const crossLength = cross.cells.length;
          const newBitmap = updateBitmap(crossLength, cross.bitmap, crosses[i][1], word[i]);
          const newCost = baseCost - cross.minCost + minCost(crossLength, newBitmap);
          if (costToBeat !== null && newCost > costToBeat) {
            failFast = true;
            break;
          }
        }
        if (failFast) {
          continue;
        }

        const newgrid = grid.gridWithEntryDecided(entry.index, word);
        if (newgrid === null) {
          continue;
        }

        const newCost = newgrid.minCost();

        // Check overall score
        if (costToBeat && newCost > costToBeat) {
          continue;
        }

        if (bestGrid === null || bestCost === null) {
          bestGrid = [newgrid, entry.index, word];
          bestCost = newCost;
        } else if (newCost < bestCost) {
          bestGrid = [newgrid, entry.index, word];
          secondBestCost = bestCost;
          bestCost = newCost;
        } else if (secondBestCost === null || newCost < secondBestCost) {
          secondBestCost = newCost;
          if (successorDiff && secondBestCost - baseCost < successorDiff) {
            skipEntry = true;
            break;
          }
        }
      }

      if (skipEntry) {
        break;
      }

      if (bestGrid === null || bestCost === null) {  // No valid option for this entry, bad grid
        return cont(null);
      }

      if (secondBestCost === null) {  // No backup option, so this entry is forced
        successor = bestGrid;
        break;
      }

      const costDiff = secondBestCost - bestCost;
      if (successorDiff === null || costDiff > successorDiff) {  // No successor or this one has higher cost differential
        successor = bestGrid;
        successorDiff = costDiff;
      }
    }

    if (successor === null) {
      throw new Error("successor was null");
    }
    const suc = successor; // weird hack around type system not realizing successor isn't null
    let nextSubset = null;
    if (subset !== null) {
      nextSubset = new Set(Array.from(subset).filter(e => e !== suc[1]))
    }

    if (!discrep || pitched.size >= discrep) {
      return recur(successor[0], discrep, pitched, nextSubset, cont);
    }

    return recur(successor[0], discrep, pitched, nextSubset,
      result => {
        const newPitched = new Set(pitched.values());
        newPitched.add(suc[1] + ":" + suc[2]);
        return recur(grid, discrep, newPitched, subset,
          res2 => {
            return cont((res2 !== null && (result === null || res2.minCost() < result.minCost())) ? res2 : result);
          }
        );
      }
    )
  };
}
