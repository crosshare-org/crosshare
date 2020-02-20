import * as React from 'react';

import _ from 'lodash';
import axios from 'axios';
import useEventListener from '@use-it/event-listener'

import './App.css';
import Cell from './Cell';


const BLOCK = ".";

type GridRowProps = {
  active: Position,
  highlights: Array<Position>,
  cellValues: Array<string>,
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
  const cells = props.cellValues.map(cell);
  return (
    <div className="grid-row">{cells}</div>
  );
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
    public readonly labelNumber: number,
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
    public readonly cells: Array<string>,
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

  static fromCells(width:number, height:number, cells:Array<string>) {
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
    return new this(width, height, cells, usedWords, entriesByCell, entries, cellLabels);
  }

  valAt(pos:Position) {
    return this.cells[pos.row * this.width + pos.col];
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

  retreatPosition(pos: Position, dir: Direction): Position {
    const [entry, index] = this.entryAtPosition(pos, dir);
    if (index > 0) {
      return entry.cells[index - 1];
    }
    return pos;
  }

  advancePosition(pos: Position, dir: Direction): Position {
    const [entry, index] = this.entryAtPosition(pos, dir);

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

  entryAtPosition(pos: Position, dir: Direction): [Entry, number] {
    const currentEntryIndex = this.entriesByCell[pos.row*this.width + pos.col][dir];
    if (!currentEntryIndex) {
      throw new Error("ERROR: No current entry index");
    }
    return [this.entries[currentEntryIndex[0]], currentEntryIndex[1]];
  }

  moveToNextEntry(pos: Position, dir: Direction, reverse = false): [Position, Direction] {
    const [currentEntry, ] = this.entryAtPosition(pos, dir);

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
    if (this.valAt(pos) === BLOCK) {
      return this.cells;
    }
    const index = pos.row * this.width + pos.col;
    let cells = [...this.cells];
    cells[index] = char;
    return cells;
  }

  rows() {
    return _.chunk(this.cells, this.width);
  }
}

type GridProps = {
  grid: GridData,
  setCellValues: React.Dispatch<React.SetStateAction<Array<string>>>,
  active: Position,
  setActive: React.Dispatch<React.SetStateAction<Position>>,
  direction: Direction,
  setDirection: React.Dispatch<React.SetStateAction<Direction>>
}

const Grid = ({active, setActive, direction, setDirection, grid, setCellValues}: GridProps) => {
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
    } else if (e.key.match(/^\w$/)) {
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
    if (grid.valAt(pos) === BLOCK) {
      return;
    }
    if (pos.row === active.row && pos.col === active.col) {
      changeDirection();
    } else {
      setActive(pos);
    }
  }

  const gridRows = grid.rows().map((cells, idx) =>
    <GridRow cellLabels={grid.cellLabels} active={active} highlights={highlights} clickHandler={clickHandler} cellValues={cells} rowNumber={idx} key={idx}/>
  );

  return (
    <div className="grid">{gridRows}</div>
  )
}

const Puzzle = (props: PuzzleJson) => {
  const answers = props.grid;
  const [active, setActive] = React.useState({col: 0, row: 0} as Position);
  const [direction, setDirection] = React.useState(Direction.Across);
  const [input, setInput] = React.useState(answers.map((s) => s === BLOCK ? BLOCK : " ") as Array<string>);

  const grid = GridData.fromCells(props.size.cols, props.size.rows, input);

  let clues = new Array<string>(grid.entries.length);
  function setClues(jsonClueList: Array<string>, direction: Direction) {
    for (let clue of jsonClueList) {
      let match = clue.match(/^(\d+)\. (.+)$/);
      if (!match || match.length < 3) {
        throw new Error("Bad clue data: '" + clue + "'");
      }
      const number = +match[1];
      const clueText = match[2];

      for (let entry of grid.entries) {
        if (entry.direction === direction && entry.labelNumber === number) {
          clues[entry.index] = clueText;
        }
      }
    }
  }
  setClues(props.clues.across, Direction.Across);
  setClues(props.clues.down, Direction.Down);

  const [entry, ] = grid.entryAtPosition(active, direction);
  const clue = clues[entry.index];

  return (
    <div id="puzzle">
      <Grid
        grid={grid} setCellValues={setInput}
        active={active} setActive={setActive}
        direction={direction} setDirection={setDirection}
      />
      <div className="current-clue"><span className="clue-label">{ entry.labelNumber }{ entry.direction === Direction.Across ? "A" : "D"}</span>{ clue }</div>
    </div>
  )
}

interface PuzzleJson {
  author: string,
  title: string,
  size: {rows: number, cols: number},
  clues: {across: Array<string>, down: Array<string>},
  grid: Array<string>
}

const App = () => {
  const [puzzle, setPuzzle] = React.useState<PuzzleJson|null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await axios(
          '/demos/presidential_appts.xw',
        );
        setPuzzle(result.data);
      } catch (error) {
        setIsError(true);
      }
      setIsLoaded(true);
    };
    fetchData();
  }, []);

  return (
    <React.Fragment>
    {isError && <div>Something went wrong ...</div>}
    {isLoaded && puzzle ? (
      <div className="app">
        <Puzzle {...puzzle}/>
      </div>
    ) : (
      <div>Loading...</div>
    )}
    </React.Fragment>
  );
}

export default App;
