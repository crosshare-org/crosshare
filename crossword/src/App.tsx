import * as React from 'react';

import useEventListener from '@use-it/event-listener'

import './App.css';
import { DB } from './wordDB';
import Cell from './Cell';


const BLOCK = ".";

type GridRowProps = {
  active: Position,
  highlights: Array<Position>,
  cellValues: string,
  rowNumber: number,
  clickHandler: (pos:Position) => void,
  cellLabels: Map<string, number>
}
function GridRow(props: GridRowProps) {
  function cell(cellValue: string, index: number) {
    const number = props.cellLabels.get(props.rowNumber + "-" + index);
    return <Cell
      active={props.active.row === props.rowNumber && props.active.col === index}
      highlight={props.highlights.some((p) => p.row === props.rowNumber && p.col === index)}
      key={index}
      number={number ? number.toString() : ""}
      row={props.rowNumber}
      column={index}
      onClick={props.clickHandler}
      value={cellValue}
      isBlock={cellValue === BLOCK}/>
  }
  const cells = props.cellValues.split("").map(cell);
  return (
    <div className="grid-row">{cells}</div>
  );
}

type GridProps = {
  width: number,
  height: number,
  cellValues: string
}

function split(str: string, len: number) {
  var ret = [ ];
  for (var offset = 0, strLen = str.length; offset < strLen; offset += len) {
    ret.push(str.slice(offset, len + offset));
  }
  return ret;
}

enum Direction {
  Across,
  Down
}

interface Position {
  row: number,
  col: number
}

class Entry {
  constructor(
    public readonly index: number,
    public readonly direction: Direction,
    public readonly cells: Array<Position>,
    public readonly isComplete: boolean
  ) {}
}

class GridData {
  public readonly sortedEntries: Array<Entry>;
  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly cells: string,
    public readonly usedWords: Set<string>,
    public readonly entriesByCell: Array<Array<[number, number]|null>>,
    public readonly entries: Array<Entry>,
    public readonly cellLabels: Map<string, number>
  ) {
    this.sortedEntries = [...entries].sort((a, b) => {
      if (a.direction !== b.direction) {
        return a.direction - b.direction;
      }
      return a.index - b.index;
    })
  }

  static fromCells(width:number, height:number, cells:string) {
    cells = cells.toUpperCase().replace("\n", "");

    let entriesByCell:Array<Array<[number, number]|null>> = new Array(cells.length);
    let entries = [];
    let usedWords:Set<string> = new Set();
    let cellLabels = new Map<string, number>();
    let currentCellLabel = 1;
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        const i = x + y * width;
        for (var dir of ([Direction.Across, Direction.Down])) {
          const xincr = (dir === Direction.Across) ? 1 : 0;
          const yincr = (dir === Direction.Down) ? 1 : 0;
          const iincr = xincr + yincr * width;

          const isRowStart = (dir === Direction.Across && x === 0) ||
                             (dir === Direction.Down && y === 0);
          const isEntryStart = (cells.charAt(i) !== BLOCK &&
                                (isRowStart || cells.charAt(i-iincr) === BLOCK) &&
                                (x + xincr < width &&
                                 y + yincr < height &&
                                 cells.charAt(i+iincr) !== BLOCK));
          if (!isEntryStart) {
            continue
          }
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
            let cellVal = cells.charAt(cellId);
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
          entries.push(new Entry(entries.length, dir, entryCells, isComplete));
        }
      }
    }
    return new this(width, height, cells, usedWords, entriesByCell, entries, cellLabels);
  }

  valAt(pos:Position) {
    return this.cells.charAt(pos.row * this.width + pos.col);
  }

  moveLeft(active: Position): Position {
    let x = active.col;
    while (x >= 0) {
      x -= 1;
      if (x >= 0 && this.valAt({...active, col: x}) !== BLOCK) {
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
      if (x < this.width && this.valAt({...active, col: x}) !== BLOCK) {
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
      if (y >= 0 && this.valAt({...active, row: y}) !== BLOCK) {
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
      if (y < this.height && this.valAt({...active, row: y}) !== BLOCK) {
        break;
      }
    }
    if (y >= this.height) {
      return active;
    }
    return {...active, row: y};
  }

  moveToNextEntry(pos: Position, dir: Direction, reverse = false): [Position, Direction] {
    const currentEntryIndex = this.entriesByCell[pos.row*this.width + pos.col][dir];
    if (!currentEntryIndex) {
      console.log("ERROR: No current entry index");
      return [pos, dir];
    }
    const currentEntry = this.entries[currentEntryIndex[0]];
    console.log("current Entry loc: " + currentEntry.cells[0].col + ", " + currentEntry.cells[0].row);

    for (var i = 0; i < this.sortedEntries.length; i += 1) {
      if (currentEntry.index === this.sortedEntries[i].index) {
        break;
      }
    }

    for (var offset = 0; offset < this.sortedEntries.length; offset += 1) {
      var index = (i + offset + 1) % this.sortedEntries.length;
      if (reverse) {
        index = (i + this.sortedEntries.length - offset - 1) % this.sortedEntries.length;
      }
      const tryEntry = this.sortedEntries[index];
      if (!tryEntry.isComplete) {
        for (var cell of tryEntry.cells) {
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
}

function Grid(props: GridProps) {
  const [active, setActive] = React.useState({col: props.width, row: props.height} as Position);
  const [direction, setDirection] = React.useState(Direction.Across);

  const grid = GridData.fromCells(props.width, props.height, props.cellValues);

  function keyboardHandler(e:React.KeyboardEvent) {
    if (e.key === " ") {
      changeDirection();
      e.preventDefault();
    } else if (e.key === "Tab") {
      if (!e.shiftKey) {
        var [pos, dir] = grid.moveToNextEntry(active, direction);
      } else {
        var [pos, dir] = grid.moveToNextEntry(active, direction, true);
      }
      setActive(pos);
      setDirection(dir);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      if (direction === Direction.Down) {
        changeDirection();
      } else {
        setActive(grid.moveRight(active));
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      if (direction === Direction.Down) {
        changeDirection();
      } else {
        setActive(grid.moveLeft(active));
      }
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      if (direction === Direction.Across) {
        changeDirection();
      } else {
        setActive(grid.moveUp(active));
      }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (direction === Direction.Across) {
        changeDirection();
      } else {
        setActive(grid.moveDown(active));
      }
      e.preventDefault();
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
    if (grid.valAt(pos) === BLOCK) {
      return;
    }
    if (pos.row === active.row && pos.col === active.col) {
      changeDirection();
    } else {
      setActive(pos);
    }
  }

  const gridRows = split(grid.cells, props.width).map((cells, idx) =>
    <GridRow cellLabels={grid.cellLabels} active={active} highlights={highlights} clickHandler={clickHandler} cellValues={cells} rowNumber={idx} key={idx}/>
  );

  return (
    <div className="grid">{gridRows}</div>
  )
}

const App = () => {
  new DB().sayHi();
  return (
    <div className="app">
      <Grid width={15} height={15} cellValues={"    .ZZ  .     " +
      "    .F   .     " +
      "    .    .     " +
      "VANBURENZOPIANO" +
      "...   ..   ...." +
      "WASHINGTONYHAWK" +
      "   ..   .      " +
      "     .   .     " +
      "      .   ..   " +
      "ROOSEVELTONJOHN" +
      "....   ..   ..." +
      "JEFFERSONNYBONO" +
      "     .    .    " +
      "     .    .    " +
      "     .    .    "} />
    </div>
  );
}

export default App;
