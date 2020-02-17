import * as React from 'react';
import './App.css';
import { DB } from './wordDB';
import Cell from './Cell';


const BLOCK = ".";

type GridRowProps = {
  active: [number, number],
  highlights: Array<[number, number]>,
  cellValues: string,
  rowNumber: number,
  clickHandler: (row: number, column: number) => void
}
function GridRow(props: GridRowProps) {
  function cell(cellValue: string, index: number) {
    const pos:[number, number] = [props.rowNumber, index];
    return <Cell
      active={props.active[0] === pos[0] && props.active[1] === pos[1]}
      highlight={props.highlights.some(([row, col]) => pos[0] === row && pos[1] === col)}
      key={index}
      number=""
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

function Grid(props: GridProps) {
  const cells = props.cellValues.toUpperCase().replace("\n", "");
  const [active, setActive] = React.useState([props.width, props.height] as [number, number]);
  const [direction, setDirection] = React.useState(Direction.Across);
  const rowIncr = direction === Direction.Down ? 1 : 0;
  const colIncr = direction === Direction.Across ? 1 : 0;
  function valAt(row: number, col: number) {
    return cells.charAt(row * props.width + col);
  }

  let highlights: Array<[number, number]> = [];
  // Add highlights backwords
  let row = active[0];
  let col = active[1];
  while (true) {
    row -= rowIncr;
    col -= colIncr;
    if (row < 0 || col < 0) {
      break;
    }
    if (valAt(row, col) === BLOCK) {
      break;
    }
    highlights.push([row, col]);
  }
  // And forwards
  row = active[0];
  col = active[1];
  while (true) {
    row += rowIncr;
    col += colIncr;
    if (row >= props.height || col >= props.width) {
      break;
    }
    if (valAt(row, col) === BLOCK) {
      break;
    }
    highlights.push([row, col]);
  }

  function changeDirection() {
    if (direction === Direction.Across) {
      setDirection(Direction.Down);
    } else {
      setDirection(Direction.Across);
    }
  }

  function clickHandler(row: number, column: number) {
    if (valAt(row, column) === BLOCK) {
      return;
    }
    if (row === active[0] && column === active[1]) {
      changeDirection();
    } else {
      setActive([row, column]);
    }
  }

  const gridRows = split(cells, props.width).map((cells, idx) =>
    <GridRow active={active} highlights={highlights} clickHandler={clickHandler} cellValues={cells} rowNumber={idx} key={idx}/>
  );

  return (
    <div className="grid">{gridRows}</div>
  )
}

const App = () => {
  new DB().sayHi();
  return (
    <div className="app">
      <Grid width={15} height={15} cellValues={"    .    .     " +
      "    .    .     " +
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
