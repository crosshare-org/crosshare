/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import useEventListener from '@use-it/event-listener'
import lodash from 'lodash';

import {Position, Direction, BLOCK} from './types';
import GridRow from './GridRow';

export class Entry {
  constructor(
    public readonly index: number,
    public readonly labelNumber: number,
    public readonly direction: Direction,
    public readonly cells: Array<Position>,
    public readonly isComplete: boolean
  ) {}
}

export class GridData {
  public readonly sortedEntries: Array<Entry>;
  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly cells: Array<string>,
    public readonly usedWords: Set<string>,
    public readonly entriesByCell: Array<Array<[number, number]|null>>,
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

  static fromCells(width:number, height:number, cells:Array<string>, allowBlockEditing=false) {
    let entriesByCell:Array<Array<[number, number]|null>> = new Array(cells.length);
    let entries = [];
    let usedWords:Set<string> = new Set();
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
                                (isRowStart || cells[i-iincr] === BLOCK) &&
                                (x + xincr < width &&
                                 y + yincr < height &&
                                 cells[i+iincr] !== BLOCK));
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
            entryCells.push({row: yt, col: xt});
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

  valAt(pos:Position) {
    return this.cells[pos.row * this.width + pos.col];
  }

  moveLeft(active: Position): Position {
    let x = active.col;
    while (x >= 0) {
      x -= 1;
      if (x >= 0 && (this.allowBlockEditing || this.valAt({...active, col: x}) !== BLOCK)) {
        break;
      }
    }
    if (x < 0) {
      return active;
    }
    return {...active, col: x};
  }

  moveRight(active: Position): Position {
    let x = active.col;
    while (x < this.width) {
      x += 1;
      if (x < this.width && (this.allowBlockEditing || this.valAt({...active, col: x}) !== BLOCK)) {
        break;
      }
    }
    if (x >= this.width) {
      return active;
    }
    return {...active, col: x};
  }

  moveUp(active: Position): Position {
    let y = active.row;
    while (y >= 0) {
      y -= 1;
      if (y >= 0 && (this.allowBlockEditing || this.valAt({...active, row: y}) !== BLOCK)) {
        break;
      }
    }
    if (y < 0) {
      return active;
    }
    return {...active, row: y};
  }

  moveDown(active: Position): Position {
    let y = active.row;
    while (y < this.height) {
      y += 1;
      if (y < this.height && (this.allowBlockEditing || this.valAt({...active, row: y}) !== BLOCK)) {
        break;
      }
    }
    if (y >= this.height) {
      return active;
    }
    return {...active, row: y};
  }

  retreatPosition(pos: Position, dir: Direction): Position {
    const [entry, index] = this.entryAtPosition(pos, dir);
    if (!entry) {
      return pos;
    }
    if (index > 0) {
      return entry.cells[index - 1];
    }
    return pos;
  }

  advancePosition(pos: Position, dir: Direction): Position {
    const [entry, index] = this.entryAtPosition(pos, dir);
    if (!entry) {
      return pos;
    }
    for (let offset = 0; offset < entry.cells.length; offset += 1) {
      let cell = entry.cells[(index + offset + 1) % entry.cells.length];
      if (this.valAt(cell) === " ") {
        return cell;
      }
    }
    if (index + 1 < entry.cells.length) {
      return entry.cells[index + 1];
    }
    return pos;
  }

  entryAtPosition(pos: Position, dir: Direction): [Entry|null, number] {
    const entriesAtCell = this.entriesByCell[pos.row*this.width + pos.col];
    if (!entriesAtCell) {
      return [null, 0];
    }
    const currentEntryIndex = entriesAtCell[dir];
    if (!currentEntryIndex) {
      return [null, 0];
    }
    return [this.entries[currentEntryIndex[0]], currentEntryIndex[1]];
  }

  entryAndCrossAtPosition(pos: Position, dir: Direction): [Entry, Entry] {
    const currentEntryIndex = this.entriesByCell[pos.row*this.width + pos.col][dir];
    const currentCrossIndex = this.entriesByCell[pos.row*this.width + pos.col][(dir + 1) % 2];
    if (!currentEntryIndex || !currentCrossIndex) {
      throw new Error("ERROR: No current entry index");
    }
    return [this.entries[currentEntryIndex[0]], this.entries[currentCrossIndex[0]]];
  }

  moveToNextEntry(pos: Position, dir: Direction, reverse = false): [Position, Direction] {
    const [currentEntry, ] = this.entryAtPosition(pos, dir);
    if (!currentEntry) {
      return [pos, dir];
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
            return [cell, tryEntry.direction];
          }
        }
      }
    }

    return [pos, dir];
  }

  getHighlights(pos:Position, dir:Direction) {
    const rowIncr = dir === Direction.Down ? 1 : 0;
    const colIncr = dir === Direction.Across ? 1 : 0;

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
      if (this.valAt({row: row, col: col}) === BLOCK) {
        break;
      }
      highlights.push({row: row, col: col});
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
      if (this.valAt({row: row, col: col}) === BLOCK) {
        break;
      }
      highlights.push({row: row, col: col});
    }
    return highlights;
  }

  cellsWithNewChar(pos: Position, char: string): Array<string> {
    const index = pos.row * this.width + pos.col;
    let cells = [...this.cells];
    if (this.valAt(pos) === BLOCK) {
      if (!this.allowBlockEditing) {
        return cells;
      }
      const flipped = (this.height - pos.row - 1) * this.width + (this.width - pos.col - 1);
      if (cells[flipped] === BLOCK) {
        cells[flipped] = " ";
      }
    }
    cells[index] = char;
    return cells;
  }

  cellsWithBlockToggled(pos: Position): Array<string> {
    let char = BLOCK;
    if (this.valAt(pos) === BLOCK) {
      char = ' ';
    }
    const index = pos.row * this.width + pos.col;
    const flipped = (this.height - pos.row - 1) * this.width + (this.width - pos.col - 1);
    let cells = [...this.cells];
    cells[index] = char;
    cells[flipped] = char;
    return cells;
  }

  rows() {
    return lodash.chunk(this.cells, this.width);
  }
}

type GridProps = {
  showingKeyboard: boolean,
  grid: GridData,
  setCellValues: React.Dispatch<React.SetStateAction<Array<string>>>,
  active: Position,
  setActive: React.Dispatch<React.SetStateAction<Position>>,
  direction: Direction,
  setDirection: React.Dispatch<React.SetStateAction<Direction>>
}

export const Grid = ({showingKeyboard, active, setActive, direction, setDirection, grid, setCellValues}: GridProps) => {
  function keyboardHandler(e:React.KeyboardEvent) {
    if (e.key === " ") {
      changeDirection();
      e.preventDefault();
    } else if (e.key === "Tab") {
      let pos, dir;
      if (!e.shiftKey) {
        [pos, dir] = grid.moveToNextEntry(active, direction);
      } else {
        [pos, dir] = grid.moveToNextEntry(active, direction, true);
      }
      setActive(pos);
      setDirection(dir);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      if (direction === Direction.Down) {
        changeDirection();
      }
      setActive(grid.moveRight(active));
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      if (direction === Direction.Down) {
        changeDirection();
      }
      setActive(grid.moveLeft(active));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      if (direction === Direction.Across) {
        changeDirection();
      }
      setActive(grid.moveUp(active));
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (direction === Direction.Across) {
        changeDirection();
      }
      setActive(grid.moveDown(active));
      e.preventDefault();
    } else if (e.key === '.' && grid.allowBlockEditing) {
      setCellValues(grid.cellsWithBlockToggled(active));
    } else if (e.key.match(/^[A-Za-z0-9]$/)) {
      const char = e.key.toUpperCase();
      setCellValues(grid.cellsWithNewChar(active, char));
      setActive(grid.advancePosition(active, direction));
    } else if (e.key === "Backspace") {
      setCellValues(grid.cellsWithNewChar(active, " "));
      setActive(grid.retreatPosition(active, direction));
    }
  }
  useEventListener('keydown', keyboardHandler);

  const highlights = grid.getHighlights(active, direction);

  function changeDirection() {
    if (direction === Direction.Across) {
      setDirection(Direction.Down);
    } else {
      setDirection(Direction.Across);
    }
  }

  function clickHandler(pos:Position) {
    if (grid.valAt(pos) === BLOCK && !grid.allowBlockEditing) {
      return;
    }
    if (pos.row === active.row && pos.col === active.col) {
      changeDirection();
    } else {
      setActive(pos);
    }
  }

  const gridRows = grid.rows().map((cells, idx) =>
    <GridRow showingKeyboard={showingKeyboard} gridWidth={grid.width} cellLabels={grid.cellLabels} active={active} highlights={highlights} clickHandler={clickHandler} cellValues={cells} rowNumber={idx} key={idx}/>
  );

  return (
    <div css={{
    }}>{gridRows}</div>
  )
}
