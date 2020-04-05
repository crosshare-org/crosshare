import { valAt, getCrosses } from './gridBase';
import {
  AutofillGrid, fromTemplate, minGridCost, stableSubsets,
  numMatchesForEntry, gridWithEntryDecided
} from './autofillGrid';
import * as WordDB from './WordDB';

enum ResultTag {
  Recur,
  Value
}
interface Result {
  type: ResultTag
}
interface Recur extends Result {
  type: ResultTag.Recur,
  grid: AutofillGrid,
  discrep: number,
  pitched: Set<string>,
  subset: Set<number>|null,
  cont: Cont
}
function isRecur(result: Result): result is Recur {
    return result.type === ResultTag.Recur;
}
function recur(grid:AutofillGrid, discrep:number, pitched:Set<string>, subset:Set<number>|null, cont:Cont): Recur {
  return {type: ResultTag.Recur, grid, discrep, pitched, subset, cont};
}
interface Value extends Result {
  type: ResultTag.Value,
  result: AutofillGrid|null
}
function isValue(result: Result): result is Value {
    return result.type === ResultTag.Value;
}
function value(x:AutofillGrid|null) {
  return {type: ResultTag.Value, result: x}
}

type Cont = (x: AutofillGrid|null) => Result;

export class Autofiller {
  public initialGrid: AutofillGrid;
  public completed: boolean;
  public solnGrid: AutofillGrid|null;
  public solnCost: number|null;
  public nextStep: Result;
  public postedSoln: boolean;
  public startTime: number;

  constructor(
    public readonly grid: string[],
    public readonly width: number,
    public readonly height: number,
    public onResult: (input: string[], result: string[]) => void,
    public onComplete: () => void
  ) {
    this.initialGrid = fromTemplate(this.grid, this.width, this.height);
    this.completed = false;
    this.solnCost = null;
    this.solnGrid = null;
    this.postedSoln = false;
    this.startTime = new Date().getTime();

    // Our initial step is a call to recur
    this.nextStep = recur(this.initialGrid, 3, new Set<string>(), null, (result) => {return value(result)});
  };

  step() {
    if (!WordDB.dbTransformed) {
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
      this.onComplete();
    }

    // If we have a solution that hasn't been posted yet, post it.
    if (this.solnGrid && !this.postedSoln) {
      this.postedSoln = true;
      this.onResult(this.grid, this.solnGrid.cells);
    }
  };

  /* Fill out a grid or a subset of a grid */
  _solve(grid: AutofillGrid, discrep: number, pitched: Set<string>, subset: Set<number>|null, cont: Cont): Result {
    const baseCost = minGridCost(grid);

    // We already have a solution that's better than this grid could possibly get
    if (this.solnCost && baseCost > this.solnCost) {
      return cont(null);
    }

    let entriesToConsider = grid.entries.filter((e) => !e.isComplete);
    // There are no entries left to consider, this grid must be a new best solution
    if (entriesToConsider.length === 0) {
      this.solnGrid = grid
      this.solnCost = baseCost
      this.postedSoln = false;
      return cont(grid)
    }

    if (subset !== null) {
      entriesToConsider = entriesToConsider.filter((e) => subset.has(e.index));
    }
    // There are no entries left in this subset, so we're done with this subsection
    if (entriesToConsider.length === 0) {
      return cont(grid);
    }

    // See if there are any stable subsets  out of the entries we're considering
    const subsets = stableSubsets(grid, subset);
    if (subsets.length > 1) {
      subsets.sort((a,b) => a.size - b.size);
      // Attempt to solve the smallest subset
      return recur(grid, discrep, pitched, subsets[0], subsolved => {
        if (subsolved === null) {
          // The subset couldn't be solved, so this grid is a failure
          return cont(null);
        } else {
          // Solve the rest of the grid
          return recur(subsolved, discrep, pitched, subset, cont);
        }
      });
    }

    // Consider entries in order of possible matches
    entriesToConsider.sort((e1, e2) => numMatchesForEntry(e1) - numMatchesForEntry(e2));
    let successor: [AutofillGrid, number, string]|null = null;
    let successorDiff: number|null = null;

    for (const entry of entriesToConsider) {
      const crosses = getCrosses(grid, entry)
      let bestGrid: [AutofillGrid, number, string]|null = null;
      let bestCost: number|null = null;
      let secondBestCost: number|null = null;

      let skipEntry = false;
      const failingLetters: Array<Set<string>> = [];
      entry.cells.forEach(() => {failingLetters.push(new Set<string>())})
      for (const [word, score] of WordDB.matchingWords(entry.length, entry.bitmap)) {
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
        let j = -1;
        for (let i = 0; i < entry.cells.length; i += 1) {
          j += 1;
          const cell = valAt(grid, entry.cells[i]);
          if (cell !== ' ') {  // Don't need to check cross
            j += cell.length - 1;
            continue;
          }
          const crossIndex = crosses[i].entryIndex;
          if (crossIndex === null) {
            continue;
          }
          if (failingLetters[i].has(word[j])) {
            failFast = true;
            break;
          }
        }
        if (!failFast) {
          let j = -1;
          for (let i = 0; i < entry.cells.length; i += 1) {
            j += 1;
            const cell = valAt(grid, entry.cells[i]);
            if (cell !== ' ') {  // Don't need to check cross
              j += cell.length - 1;
              continue;
            }
            const crossIndex = crosses[i].entryIndex;
            if (crossIndex === null) {
              continue;
            }
            const cross = grid.entries[crossIndex];
            const crossLength = cross.length;
            const newBitmap = WordDB.updateBitmap(crossLength, cross.bitmap, crosses[i].wordIndex, word[j]);
            if (newBitmap.equals(WordDB.ZERO)) {
              failingLetters[i].add(word[j]);
              failFast = true;
              break;
            }
            const newCost = baseCost - cross.minCost + WordDB.minCost(crossLength, newBitmap);
            if (costToBeat !== null && newCost > costToBeat) {
              failingLetters[i].add(word[j]);
              failFast = true;
              break;
            }
          }
        }
        if (failFast) {
          continue;
        }

        const newgrid = gridWithEntryDecided(grid, entry.index, word, score);
        if (newgrid === null) {
          continue;
        }

        const newCost = minGridCost(newgrid);

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
            return cont((res2 !== null && (result === null || minGridCost(res2) < minGridCost(result))) ? res2 : result);
          }
        );
      }
    )
  };
}
