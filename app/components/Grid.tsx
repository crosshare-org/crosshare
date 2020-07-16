import { Dispatch, ReactNode, useCallback } from 'react';

import { PosAndDir, BLOCK } from '../lib/types';
import { Cell } from './Cell';
import { PuzzleAction, SetActivePositionAction } from '../reducers/reducer';
import { ViewableGrid, ViewableEntry } from '../lib/viewableGrid';
import { cellIndex, getEntryCells } from '../lib/gridBase';

type GridViewProps = {
  grid: ViewableGrid<ViewableEntry>,
  active: PosAndDir,
  dispatch: Dispatch<PuzzleAction>,
  revealedCells?: Set<number>,
  verifiedCells?: Set<number>,
  wrongCells?: Set<number>,
  allowBlockEditing?: boolean,
  autofill?: Array<string>,
  squareWidth: number,
  cellColors?: Array<number>,
  highlightEntry?: number,
}

export const GridView = ({ active, dispatch, grid, ...props }: GridViewProps) => {
  const entryCells = getEntryCells(grid, active);
  const highlightCells = props.highlightEntry !== undefined ? grid.entries[props.highlightEntry].cells : [];

  const noOp = useCallback(() => undefined, []);
  const changeActive = useCallback((pos) => {
    const a: SetActivePositionAction = { type: 'SETACTIVEPOSITION', newActive: pos };
    dispatch(a);
  }, [dispatch]);
  const changeDirection = useCallback(() => dispatch({ type: 'CHANGEDIRECTION' }), [dispatch]);

  const cells = new Array<ReactNode>();
  for (let idx = 0; idx < grid.cells.length; idx += 1) {
    const cellValue = grid.cells[idx];
    const number = grid.cellLabels.get(idx);
    const isActive = cellIndex(grid, active) === idx;
    let onClick = changeActive;
    if (cellValue === BLOCK && !props.allowBlockEditing) {
      onClick = noOp;
    } else if (isActive) {
      onClick = changeDirection;
    }
    cells.push(<Cell
      squareWidth={props.squareWidth}
      autofill={props.autofill ? props.autofill[idx] : ''}
      gridWidth={grid.width}
      active={isActive}
      entryCell={entryCells.some((p) => cellIndex(grid, p) === idx)}
      highlightCell={highlightCells.some((p) => cellIndex(grid, p) === idx)}
      key={idx}
      number={number ? number.toString() : ''}
      row={Math.floor(idx / grid.width)}
      column={idx % grid.width}
      onClick={onClick}
      value={cellValue}
      isBlock={cellValue === BLOCK}
      isVerified={props.verifiedCells ?.has(idx)}
      isWrong={props.wrongCells ?.has(idx)}
      wasRevealed={props.revealedCells ?.has(idx)}
      highlight={grid.highlighted.has(idx) ? grid.highlight : undefined}
      cellColor={props.cellColors ?.[idx]}
    />);
  }
  return <>{cells}</>;
};
