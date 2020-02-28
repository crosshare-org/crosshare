import * as React from 'react';

import Cell from './Cell';
import {Position, BLOCK} from './types';

type GridRowProps = {
  showingKeyboard: boolean,
  active: Position,
  highlights: Array<Position>,
  cellValues: Array<string>,
  rowNumber: number,
  clickHandler: (pos:Position) => void,
  cellLabels: Map<string, number>,
  gridWidth: number
}

export default function GridRow(props: GridRowProps) {
  function cell(cellValue: string, index: number) {
    const number = props.cellLabels.get(props.rowNumber + "-" + index);
    return <Cell
      showingKeyboard={props.showingKeyboard}
      gridWidth={props.gridWidth}
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
