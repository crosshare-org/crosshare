/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { Position, Direction, PosAndDir, BLOCK } from './types';
import { Cell } from './Cell';
import { Symmetry, PuzzleAction, SetActivePositionAction } from './reducer';


export interface EntryBase {
  index: number,
  direction: Direction,
  cells: Array<Position>,
  isComplete: boolean,
  pattern: string,
}

export interface ViewableEntry extends EntryBase {
  labelNumber: number,
  clue: string,
}

export interface Cross {
  entryIndex: number, // Entry index
  cellIndex: number,  // Position of the crossing in the entry.cells array
  wordIndex: number   // Position of the crossing in the resultant string (could be different due to rebus)
}

export abstract class GridBase<Entry extends EntryBase> {
  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly cells: string[],
    public readonly _entriesByCell: Array<[Cross, Cross]>,
    public readonly entries: Entry[]
  ) {}

  entriesByCell(pos: Position) {
    return this._entriesByCell[pos.row * this.width + pos.col];
  }

  /**
   * Given an entry, get the crossing entries.
   *
   * Returns an array of (entry index, letter idx w/in that entry) of crosses.
   */
  crosses(entry:Entry): Cross[] {
    const crossDir = (entry.direction === Direction.Across) ? Direction.Down : Direction.Across;
    const crosses: Array<Cross> = [];
    entry.cells.forEach((cellIndex) => {
      crosses.push(this.entriesByCell(cellIndex)[crossDir]);
    })
    return crosses;
  }

  valAt(pos: Position) {
    return this.cells[pos.row * this.width + pos.col];
  }

  entryWord(entryIndex: number) {
    return this.entries[entryIndex].cells.map((pos) => this.valAt(pos)).join("");
  }

  setVal(pos: Position, val: string) {
    this.cells[pos.row * this.width + pos.col] = val;
  }

  cellIndex(pos: Position) {
    return pos.row * this.width + pos.col;
  }

  posForIndex(index: number) {
    return {col: index % this.width, row: Math.floor(index / this.width) % this.height};
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

  entryAtPosition(pos: PosAndDir): [Entry | null, number] {
    const entriesAtCell = this.entriesByCell(pos);
    const currentEntryIndex = entriesAtCell[pos.dir];
    if (currentEntryIndex.entryIndex === -1) {
      return [null, 0];
    }
    return [this.entries[currentEntryIndex.entryIndex], currentEntryIndex.wordIndex];
  }

  entryAndCrossAtPosition(pos: PosAndDir): [Entry | null, Entry | null] {
    const entries = this.entriesByCell(pos);
    if (!entries) {
      return [null,null];
    }
    const currentEntry = entries[pos.dir];
    const currentCross = entries[(pos.dir + 1) % 2];
    return [
      currentEntry.entryIndex === -1 ? null : this.entries[currentEntry.entryIndex],
      currentCross.entryIndex === -1 ? null : this.entries[currentCross.entryIndex]
    ];
  }

  getEntryCells(pos: PosAndDir) {
    let highlights: Array<Position> = [];
    const entry = this.entryAtPosition(pos);
    if (entry[0] !== null) {
      highlights = entry[0].cells;
    }
    return highlights;
  }

  static entriesFromCells(width: number, height: number, cells: Array<string>): [Array<EntryBase>, Array<[Cross, Cross]>] {

    const entriesByCell: Array<[Cross, Cross]> = [];
    cells.forEach(() => {
      entriesByCell.push([{entryIndex:-1,wordIndex:0,cellIndex:0}, {entryIndex:-1,wordIndex:0,cellIndex:0}]);
    });

    const entries: Array<EntryBase> = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = x + y * width;
        for (let dir of ([Direction.Across, Direction.Down])) {
          const xincr = (dir === Direction.Across) ? 1 : 0;
          const yincr = (dir === Direction.Down) ? 1 : 0;
          const iincr = xincr + yincr * width;
          const isStartOfRow = (dir === Direction.Across && x === 0) ||
            (dir === Direction.Down && y === 0);
          const isStartOfEntry = (cells[i] !== '.' &&
            (isStartOfRow || cells[i-iincr] === '.') &&
            (x + xincr < width && y + yincr < height && cells[i+iincr] !== '.'));

          if (!isStartOfEntry) {
            continue;
          }

          const entryCells: Position[] = [];
          let entryPattern = "";
          let isComplete = true;
          let xt = x;
          let yt = y;
          let wordlen = 0;
          while (xt < width && yt < height) {
            const cellId = yt * width + xt;
            const cellVal = cells[cellId];
            entriesByCell[cellId][dir] = {entryIndex: entries.length, wordIndex: entryPattern.length, cellIndex: wordlen};
            if (cellVal === '.') {
              break;
            }
            if (cellVal === ' ') {
              isComplete = false;
            }
            entryCells.push({row: yt, col: xt});
            entryPattern += cellVal;
            xt += xincr;
            yt += yincr;
            wordlen += 1;
          }
          entries.push({
            index: entries.length,
            pattern: entryPattern,
            direction: dir,
            cells: entryCells,
            isComplete: isComplete,
          });
        }
      }
    }
    return [entries, entriesByCell];
  }
}

export class GridData extends GridBase<ViewableEntry> {
  public readonly sortedEntries: Array<ViewableEntry>;
  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly cells: Array<string>,
    public readonly _entriesByCell: Array<[Cross, Cross]>,
    public readonly entries: Array<ViewableEntry>,
    public readonly cellLabels: Map<number, number>,
    public readonly allowBlockEditing: boolean,
    public readonly acrossClues: Array<string>,
    public readonly downClues: Array<string>,
    public readonly highlighted: Set<number>,
    public readonly highlight: "circle" | "shade" | undefined,
  ) {
    super(width, height, cells, _entriesByCell, entries);
    this.sortedEntries = [...entries].sort((a, b) => {
      if (a.direction !== b.direction) {
        return a.direction - b.direction;
      }
      return a.index - b.index;
    })
  }

  static fromCells(width: number, height: number, cells: Array<string>, allowBlockEditing: boolean, acrossClues: Array<string>, downClues: Array<string>, highlighted: Set<number>, highlight: "circle" | "shade" | undefined) {
    const [baseEntries, entriesByCell] = this.entriesFromCells(width, height, cells);

    let clues = [new Map<number, string>(), new Map<number, string>()];
    function setClues(jsonClueList: Array<string>, direction: Direction) {
      for (let clue of jsonClueList) {
        let match = clue.match(/^(\d+)\. (.+)$/);
        if (!match || match.length < 3) {
          throw new Error("Bad clue data: '" + clue + "'");
        }
        const number = +match[1];
        const clueText = match[2];
        clues[direction].set(number, clueText);
      }
    }
    setClues(acrossClues, Direction.Across);
    setClues(downClues, Direction.Down);

    let cellLabels = new Map<number, number>();
    let currentCellLabel = 1;
    const entries: Array<ViewableEntry> = [];
    for (const baseEntry of baseEntries) {
      const startPos = baseEntry.cells[0];
      const i = startPos.row * width + startPos.col;
      let entryLabel = cellLabels.get(i) || currentCellLabel;
      if (!cellLabels.has(i)) {
        cellLabels.set(i, currentCellLabel);
        currentCellLabel += 1;
      }
      let entryClue = clues[baseEntry.direction].get(entryLabel);
      if (!entryClue) {
        if (allowBlockEditing) {  // We're constructing a puzzle, so clues can be missing
          entryClue = "";
        } else {
          throw new Error("Can't find clue for " + entryLabel + " " + baseEntry.direction);
        }
      }
      entries.push({
        ...baseEntry,
        labelNumber: entryLabel,
        clue: entryClue,
      });
    }
    return new this(width, height, cells, entriesByCell, entries, cellLabels, allowBlockEditing, acrossClues, downClues, highlighted, highlight);
  }

  moveLeft(active: Position): Position {
    let x = active.col;
    while (x >= 0) {
      x -= 1;
      if (x >= 0 && (this.allowBlockEditing || this.valAt({ ...active, col: x }) !== BLOCK)) {
        break;
      }
    }
    if (x < 0) {
      return active;
    }
    return { ...active, col: x };
  }

  moveRight(active: Position): Position {
    let x = active.col;
    while (x < this.width) {
      x += 1;
      if (x < this.width && (this.allowBlockEditing || this.valAt({ ...active, col: x }) !== BLOCK)) {
        break;
      }
    }
    if (x >= this.width) {
      return active;
    }
    return { ...active, col: x };
  }

  moveUp(active: Position): Position {
    let y = active.row;
    while (y >= 0) {
      y -= 1;
      if (y >= 0 && (this.allowBlockEditing || this.valAt({ ...active, row: y }) !== BLOCK)) {
        break;
      }
    }
    if (y < 0) {
      return active;
    }
    return { ...active, row: y };
  }

  moveDown(active: Position): Position {
    let y = active.row;
    while (y < this.height) {
      y += 1;
      if (y < this.height && (this.allowBlockEditing || this.valAt({ ...active, row: y }) !== BLOCK)) {
        break;
      }
    }
    if (y >= this.height) {
      return active;
    }
    return { ...active, row: y };
  }

  retreatPosition(pos: PosAndDir): PosAndDir {
    const [entry, index] = this.entryAtPosition(pos);
    if (!entry) {
      return pos;
    }
    if (index > 0) {
      return {...entry.cells[index - 1], dir: pos.dir};
    }
    return pos;
  }

  nextNonBlock(pos: Position) {
    const index = this.cellIndex(pos);
    for (let offset = 0; offset < this.cells.length; offset += 1) {
      if (this.cells[(index + offset) % this.cells.length] !== BLOCK) {
        return this.posForIndex(index + offset);
      }
    }
    return pos;
  }

  advancePosition(pos: PosAndDir, wrongCells: Set<number>): PosAndDir {
    const [entry, index] = this.entryAtPosition(pos);
    if (!entry) {
      return pos;
    }
    for (let offset = 0; offset < entry.cells.length; offset += 1) {
      let cell = entry.cells[(index + offset + 1) % entry.cells.length];
      if (this.valAt(cell) === " " || wrongCells.has(this.cellIndex(cell))) {
        return {...cell, dir: pos.dir};
      }
    }
    if (index === entry.cells.length - 1) {
      return this.moveToNextEntry(pos);
    }
    return {...entry.cells[index + 1], dir: pos.dir};
  }

  moveToPrevEntry(pos: PosAndDir): PosAndDir {
    return this.moveToNextEntry(pos, true);
  }

  moveToNextEntry(pos: PosAndDir, reverse = false): PosAndDir {
    const [currentEntry,] = this.entryAtPosition(pos);
    if (!currentEntry) {
      const xincr = (pos.dir === Direction.Across) ? 1 : 0;
      const yincr = (pos.dir === Direction.Down) ? 1 : 0;
      let iincr = xincr + yincr * this.width;
      if (reverse) {
        iincr *= -1;
      }
      return {...this.posForIndex((this.cellIndex(pos) + iincr) % (this.width * this.height)), dir: pos.dir};
    }

    // Find position in the sorted array of entries
    let i = 0;
    for (; i < this.sortedEntries.length; i += 1) {
      if (currentEntry.index === this.sortedEntries[i].index) {
        break;
      }
    }

    // Now find the next entry in the sorted array that isn't complete
    for (let offset = 0; offset < this.sortedEntries.length; offset += 1) {
      let index = (i + offset + 1) % this.sortedEntries.length;
      if (reverse) {
        index = (i + this.sortedEntries.length - offset - 1) % this.sortedEntries.length;
      }
      const tryEntry = this.sortedEntries[index];
      if (!tryEntry.isComplete) {
        for (let cell of tryEntry.cells) {
          if (this.valAt(cell) === " ") {
            return {...cell, dir: tryEntry.direction};
          }
        }
      }
    }

    return pos;
  }

  gridWithNewChar(pos: Position, char: string, sym: Symmetry): GridData {
    const index = pos.row * this.width + pos.col;
    let cells = [...this.cells];
    if (this.valAt(pos) === BLOCK) {
      if (!this.allowBlockEditing) {
        return this;
      }

      if (sym === Symmetry.Rotational) {
        const flipped = (this.height - pos.row - 1) * this.width + (this.width - pos.col - 1);
        if (cells[flipped] === BLOCK) {
          cells[flipped] = " ";
        }
      } else if (sym === Symmetry.Horizontal) {
        const flipped = (this.height - pos.row - 1) * this.width + pos.col;
        if (cells[flipped] === BLOCK) {
          cells[flipped] = " ";
        }
      } else if (sym === Symmetry.Vertical) {
        const flipped = pos.row * this.width + (this.width - pos.col - 1);
        if (cells[flipped] === BLOCK) {
          cells[flipped] = " ";
        }
      }
    }
    cells[index] = char;
    // TODO - can we prevent some re-init here?
    return GridData.fromCells(this.width, this.height, cells, this.allowBlockEditing, this.acrossClues, this.downClues, this.highlighted, this.highlight);
  }

  gridWithBlockToggled(pos: Position, sym: Symmetry): GridData {
    let char = BLOCK;
    if (this.valAt(pos) === BLOCK) {
      char = ' ';
    }
    const index = pos.row * this.width + pos.col;
    let cells = [...this.cells];
    cells[index] = char;

    if (sym === Symmetry.Rotational) {
      const flipped = (this.height - pos.row - 1) * this.width + (this.width - pos.col - 1);
      cells[flipped] = char;
    } else if (sym === Symmetry.Horizontal) {
      const flipped = (this.height - pos.row - 1) * this.width + pos.col;
      cells[flipped] = char;
    } else if (sym === Symmetry.Vertical) {
      const flipped = pos.row * this.width + (this.width - pos.col - 1);
      cells[flipped] = char;
    }
    // TODO - can we prevent some re-init here?
    return GridData.fromCells(this.width, this.height, cells, this.allowBlockEditing, this.acrossClues, this.downClues, this.highlighted, this.highlight);
  }
}

type GridViewProps = {
  showingKeyboard: boolean,
  grid: GridData,
  active: PosAndDir,
  dispatch: React.Dispatch<PuzzleAction>,
  revealedCells?: Set<number>,
  verifiedCells?: Set<number>,
  wrongCells?: Set<number>,
  allowBlockEditing?: boolean,
  autofill?: Array<string>,
}

export const GridView = ({ showingKeyboard, active, dispatch, grid, ...props}: GridViewProps) => {
  const entryCells = grid.getEntryCells(active);

  const noOp = React.useCallback(() => undefined, []);
  const changeActive = React.useCallback((pos) => dispatch({type: "SETACTIVEPOSITION", newActive: pos} as SetActivePositionAction), [dispatch]);
  const changeDirection = React.useCallback(() => dispatch({type: "CHANGEDIRECTION"} as PuzzleAction), [dispatch]);

  let cells = new Array<React.ReactNode>();
  for (let cellIndex = 0; cellIndex < grid.cells.length; cellIndex += 1) {
    const cellValue = grid.cells[cellIndex];
    const number = grid.cellLabels.get(cellIndex);
    const isActive = grid.cellIndex(active) === cellIndex;
    var onClick = changeActive;
    if (cellValue === BLOCK && !props.allowBlockEditing) {
      onClick = noOp;
    } else if (isActive) {
      onClick = changeDirection;
    }
    cells.push(<Cell
      autofill={props.autofill ? props.autofill[cellIndex] : ''}
      showingKeyboard={showingKeyboard}
      gridWidth={grid.width}
      active={isActive}
      entryCell={entryCells.some((p) => grid.cellIndex(p) === cellIndex)}
      key={cellIndex}
      number={number ? number.toString() : ""}
      row={Math.floor(cellIndex / grid.width)}
      column={cellIndex % grid.width}
      onClick={onClick}
      value={cellValue}
      isBlock={cellValue === BLOCK}
      isVerified={props.verifiedCells?.has(cellIndex)}
      isWrong={props.wrongCells?.has(cellIndex)}
      wasRevealed={props.revealedCells?.has(cellIndex)}
      highlight={grid.highlighted.has(cellIndex) ? grid.highlight : undefined}
    />);
  }
  return <React.Fragment>{cells}</React.Fragment>;
}
