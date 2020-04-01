/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { Position, Direction, PosAndDir, BLOCK } from './types';
import { Cell } from './Cell';
import { Symmetry, PuzzleAction, SetActivePositionAction } from './reducer';

export interface Entry {
  index: number,
  labelNumber: number,
  direction: Direction,
  cells: Array<Position>,
  isComplete: boolean,
  clue: string,
}

interface Cross {
  entryIndex: number, // Entry index
  cellIndex: number,  // Position of the crossing in the entry.cells array
  wordIndex: number   // Position of the crossing in the resultant string (could be different due to rebus)
}

export class GridData {
  public readonly sortedEntries: Array<Entry>;
  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly cells: Array<string>,
    public readonly usedWords: Set<string>,
    public readonly _entriesByCell: Array<[Cross, Cross]>,
    public readonly entries: Array<Entry>,
    public readonly cellLabels: Map<number, number>,
    public readonly allowBlockEditing: boolean,
    public readonly acrossClues: Array<string>,
    public readonly downClues: Array<string>,
    public readonly highlighted: Set<number>,
    public readonly highlight: "circle" | "shade" | undefined,
  ) {
    this.sortedEntries = [...entries].sort((a, b) => {
      if (a.direction !== b.direction) {
        return a.direction - b.direction;
      }
      return a.index - b.index;
    })
  }

  entriesByCell(pos: Position) {
    return this._entriesByCell[pos.row * this.width + pos.col];
  }

  entryWord(entryIndex: number) {
    return this.entries[entryIndex].cells.map((pos) => this.valAt(pos)).join("");
  }

  static fromCells(width: number, height: number, cells: Array<string>, allowBlockEditing: boolean, acrossClues: Array<string>, downClues: Array<string>, highlighted: Set<number>, highlight: "circle" | "shade" | undefined) {
    const entriesByCell: Array<[Cross, Cross]> = [];
    cells.forEach(() => {
      entriesByCell.push([{entryIndex:-1,wordIndex:0,cellIndex:0}, {entryIndex:-1,wordIndex:0,cellIndex:0}]);
    });
    let entries = [];
    let usedWords: Set<string> = new Set();
    let cellLabels = new Map<number, number>();
    let currentCellLabel = 1;

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

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = x + y * width;
        for (let dir of ([Direction.Across, Direction.Down])) {
          const xincr = (dir === Direction.Across) ? 1 : 0;
          const yincr = (dir === Direction.Down) ? 1 : 0;
          const iincr = xincr + yincr * width;

          const isRowStart = (dir === Direction.Across && x === 0) ||
            (dir === Direction.Down && y === 0);
          const isEntryStart = (cells[i] !== BLOCK &&
            (isRowStart || cells[i - iincr] === BLOCK) &&
            (x + xincr < width &&
              y + yincr < height &&
              cells[i + iincr] !== BLOCK));
          if (!isEntryStart) {
            continue
          }
          let entryLabel = cellLabels.get(i) || currentCellLabel;
          if (!cellLabels.has(i)) {
            cellLabels.set(i, currentCellLabel);
            currentCellLabel += 1;
          }
          let entryClue = clues[dir].get(entryLabel);
          if (!entryClue) {
            if (allowBlockEditing) {  // We're constructing a puzzle, so clues can be missing
              entryClue = "";
            } else {
              throw new Error("Can't find clue for " + entryLabel + " " + dir);
            }
          }
          let entryCells = [];
          let entryPattern = "";
          let isComplete = true;
          let xt = x;
          let yt = y;
          let wordlen = 0;
          while (xt < width && yt < height) {
            let cellId = yt * width + xt;
            let cellVal = cells[cellId];
            entriesByCell[cellId][dir] = {entryIndex: entries.length, wordIndex: entryPattern.length, cellIndex: wordlen};
            if (cellVal === BLOCK) {
              break;
            }
            if (cellVal === ' ') {
              isComplete = false;
            }
            entryCells.push({ row: yt, col: xt });
            entryPattern += cellVal;
            xt += xincr;
            yt += yincr;
            wordlen += 1;
          }
          if (isComplete) {
            usedWords.add(entryPattern);
          }
          entries.push({
            index: entries.length,
            labelNumber: entryLabel,
            direction: dir,
            cells: entryCells,
            isComplete: isComplete,
            clue: entryClue,
          });
        }
      }
    }
    return new this(width, height, cells, usedWords, entriesByCell, entries, cellLabels, allowBlockEditing, acrossClues, downClues, highlighted, highlight);
  }

  cellIndex(pos: Position) {
    return pos.row * this.width + pos.col;
  }

  posForIndex(index: number) {
    return {col: index % this.width, row: Math.floor(index / this.width) % this.height};
  }

  valAt(pos: Position) {
    return this.cells[this.cellIndex(pos)];
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

  entryAtPosition(pos: PosAndDir): [Entry | null, number] {
    const entriesAtCell = this.entriesByCell(pos);
    const currentEntryIndex = entriesAtCell[pos.dir];
    if (currentEntryIndex.entryIndex === -1) {
      return [null, 0];
    }
    return [this.entries[currentEntryIndex.entryIndex], currentEntryIndex.wordIndex];
  }

  entryAndCrossAtPosition(pos: PosAndDir): [Entry, Entry]|null {
    const entries = this.entriesByCell(pos);
    if (!entries || entries[0].entryIndex === -1 || entries[1].entryIndex === -1) {
      return null;
    }
    console.log(entries);
    const currentEntryIndex = entries[pos.dir];
    const currentCrossIndex = entries[(pos.dir + 1) % 2];
    if (!currentEntryIndex || !currentCrossIndex) {
      throw new Error("ERROR: No current entry index");
    }
    return [this.entries[currentEntryIndex.entryIndex], this.entries[currentCrossIndex.entryIndex]];
  }

  moveToPrevEntry(pos: PosAndDir): PosAndDir {
    return this.moveToNextEntry(pos, true);
  }

  moveToNextEntry(pos: PosAndDir, reverse = false): PosAndDir {
    const [currentEntry,] = this.entryAtPosition(pos);
    if (!currentEntry) {
      return pos;
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

  getEntryCells(pos: PosAndDir) {
    const rowIncr = pos.dir === Direction.Down ? 1 : 0;
    const colIncr = pos.dir === Direction.Across ? 1 : 0;

    let highlights: Array<Position> = [];
    // Add highlights backwords
    let row = pos.row;
    let col = pos.col;
    while (true) {
      row -= rowIncr;
      col -= colIncr;
      if (row < 0 || col < 0) {
        break;
      }
      if (this.valAt({ row: row, col: col }) === BLOCK) {
        break;
      }
      highlights.push({ row: row, col: col });
    }
    // And forwards
    row = pos.row;
    col = pos.col;
    while (true) {
      row += rowIncr;
      col += colIncr;
      if (row >= this.height || col >= this.width) {
        break;
      }
      if (this.valAt({ row: row, col: col }) === BLOCK) {
        break;
      }
      highlights.push({ row: row, col: col });
    }
    return highlights;
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

type GridProps = {
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

export const Grid = ({ showingKeyboard, active, dispatch, grid, ...props}: GridProps) => {
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
