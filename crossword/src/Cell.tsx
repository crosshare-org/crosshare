import * as React from 'react';

type CellProps = {
  gridWidth: number,
  isBlock: boolean,
  active: boolean,
  highlight: boolean,
  value: string,
  number: string,
  row: number,
  column: number,
  onClick: (pos:{row: number, col:number}) => void
}

export default function Cell(props: CellProps) {
  var classname="cell";
  if (props.isBlock) {
    classname += " cell-block";
  }
  if (props.row === 0) {
    classname += " cell-top"
  }
  if (props.column === 0) {
    classname += " cell-left"
  }
  if (props.active) {
    classname += " cell-active"
  }
  if (props.highlight) {
    classname += " cell-highlight"
  }

  const sideLength = (100 / props.gridWidth) + "%"
  const style = {
    width: sideLength,
    paddingBottom: sideLength,
  };
  return (
    <div className="cell-container" style={style}>
      <div className={classname} onClick={() => props.onClick({row: props.row, col: props.column})}>
        {!props.isBlock ?
          <>
          <div className="cell-label">{props.number}</div>
          <div className="cell-value">{props.value}</div>
          </>
          : ""}
      </div>
    </div>
  );
}
