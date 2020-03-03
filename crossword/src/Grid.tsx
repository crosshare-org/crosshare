/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import lodash from 'lodash';

import { Position, Direction, PosAndDir, BLOCK } from './types';
import { Cell } from './Cell';
import { PuzzleAction, SetActivePositionAction } from './Puzzle';

export class Entry {
  constructor(
    public readonly index: number,
    public readonly labelNumber: number,
    public readonly direction: Direction,
    public readonly cells: Array<Position>,
    public readonly isComplete: boolean
  ) { }
}

export class GridData {
  public readonly sortedEntries: Array<Entry>;
  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly cells: Array<string>,
    public readonly usedWords: Set<string>,
    public readonly entriesByCell: Array<Array<[number, number] | null>>,
    public readonly entries: Array<Entry>,
    public readonly cellLabels: Map<string, number>,
    public readonly allowBlockEditing: boolean
  ) {
    this.sortedEntries = [...entries].sort((a, b) => {
      if (a.direction !== b.direction) {
        return a.direction - b.direction;
      }
      return a.index - b.index;
    })
  }

  static fromCells(width: number, height: number, cells: Array<string>, allowBlockEditing = false) {
    let entriesByCell: Array<Array<[number, number] | null>> = new Array(cells.length);
    let entries = [];
    let usedWords: Set<string> = new Set();
    let cellLabels = new Map<string, number>();
    let currentCellLabel = 1;
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
          let entryLabel = cellLabels.get(y + "-" + x) || currentCellLabel;
          if (!cellLabels.has(y + "-" + x)) {
            cellLabels.set(y + "-" + x, currentCellLabel);
            currentCellLabel += 1;
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
            if (!entriesByCell[cellId]) {
              entriesByCell[cellId] = [null, null];
            }
            entriesByCell[cellId][dir] = [entries.length, wordlen];
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
          entries.push(new Entry(entries.length, entryLabel, dir, entryCells, isComplete));
        }
      }
    }
    return new this(width, height, cells, usedWords, entriesByCell, entries, cellLabels, allowBlockEditing);
  }

  valAt(pos: Position) {
    return this.cells[pos.row * this.width + pos.col];
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

  advancePosition(pos: PosAndDir): PosAndDir {
    const [entry, index] = this.entryAtPosition(pos);
    if (!entry) {
      return pos;
    }
    for (let offset = 0; offset < entry.cells.length; offset += 1) {
      let cell = entry.cells[(index + offset + 1) % entry.cells.length];
      if (this.valAt(cell) === " ") {
        return {...cell, dir: pos.dir};
      }
    }
    if (index + 1 < entry.cells.length) {
      return {...entry.cells[index + 1], dir: pos.dir};
    }
    return pos;
  }

  entryAtPosition(pos: PosAndDir): [Entry | null, number] {
    const entriesAtCell = this.entriesByCell[pos.row * this.width + pos.col];
    if (!entriesAtCell) {
      return [null, 0];
    }
    const currentEntryIndex = entriesAtCell[pos.dir];
    if (!currentEntryIndex) {
      return [null, 0];
    }
    return [this.entries[currentEntryIndex[0]], currentEntryIndex[1]];
  }

  entryAndCrossAtPosition(pos: PosAndDir): [Entry, Entry] {
    const currentEntryIndex = this.entriesByCell[pos.row * this.width + pos.col][pos.dir];
    const currentCrossIndex = this.entriesByCell[pos.row * this.width + pos.col][(pos.dir + 1) % 2];
    if (!currentEntryIndex || !currentCrossIndex) {
      throw new Error("ERROR: No current entry index");
    }
    return [this.entries[currentEntryIndex[0]], this.entries[currentCrossIndex[0]]];
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

  getHighlights(pos: PosAndDir) {
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

  gridWithNewChar(pos: Position, char: string): GridData {
    const index = pos.row * this.width + pos.col;
    let cells = [...this.cells];
    if (this.valAt(pos) === BLOCK) {
      if (!this.allowBlockEditing) {
        return this;
      }
      const flipped = (this.height - pos.row - 1) * this.width + (this.width - pos.col - 1);
      if (cells[flipped] === BLOCK) {
        cells[flipped] = " ";
      }
    }
    cells[index] = char;
    // TODO - can we prevent some re-init here?
    return GridData.fromCells(this.width, this.height, cells, this.allowBlockEditing);
  }

  gridWithBlockToggled(pos: Position): GridData {
    let char = BLOCK;
    if (this.valAt(pos) === BLOCK) {
      char = ' ';
    }
    const index = pos.row * this.width + pos.col;
    const flipped = (this.height - pos.row - 1) * this.width + (this.width - pos.col - 1);
    let cells = [...this.cells];
    cells[index] = char;
    cells[flipped] = char;
    // TODO - can we prevent some re-init here?
    return GridData.fromCells(this.width, this.height, cells, this.allowBlockEditing);
  }

  rows() {
    return lodash.chunk(this.cells, this.width);
  }
}

type GridProps = {
  showingKeyboard: boolean,
  grid: GridData,
  active: PosAndDir,
  dispatch: React.Dispatch<PuzzleAction>,
}

export const Grid = ({ showingKeyboard, active, dispatch, grid }: GridProps) => {
  const highlights = grid.getHighlights(active);

  const noOp = React.useCallback(() => undefined, []);
  const changeActive = React.useCallback((pos) => dispatch({type: "SETACTIVEPOSITION", newActive: pos} as SetActivePositionAction), [dispatch]);
  const changeDirection = React.useCallback(() => dispatch({type: "CHANGEDIRECTION"} as PuzzleAction), [dispatch]);

  let cells = new Array<React.ReactNode>();
  let rows = grid.rows()
  for (let row_idx = 0; row_idx < rows.length; row_idx += 1) {
    const row = rows[row_idx];
    for (let col_idx = 0; col_idx < row.length; col_idx += 1) {
      const cellValue = row[col_idx];
      const key = row_idx + "-" + col_idx
      const number = grid.cellLabels.get(key);
      const isActive = active.row === row_idx && active.col === col_idx;
      var onClick = changeActive;
      if (cellValue === BLOCK) {
        onClick = noOp;
      } else if (isActive) {
        onClick = changeDirection;
      }
      cells.push(<Cell
        showingKeyboard={showingKeyboard}
        gridWidth={grid.width}
        active={isActive}
        highlight={highlights.some((p) => p.row === row_idx && p.col === col_idx)}
        key={key}
        number={number ? number.toString() : ""}
        row={row_idx}
        column={col_idx}
        onClick={onClick}
        value={cellValue}
        isBlock={cellValue === BLOCK}
      />);
    }
  }
  return <React.Fragment>{cells}</React.Fragment>;
}
