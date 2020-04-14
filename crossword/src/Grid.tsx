/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { PosAndDir, BLOCK } from './types';
import { Cell } from './Cell';
import { PuzzleAction, SetActivePositionAction } from './reducer';
import { ViewableGrid, ViewableEntry } from './viewableGrid';
import { cellIndex, getEntryCells } from './gridBase';

type GridViewProps = {
  showingKeyboard: boolean,
  grid: ViewableGrid<ViewableEntry>,
  active: PosAndDir,
  dispatch: React.Dispatch<PuzzleAction>,
  revealedCells?: Set<number>,
  verifiedCells?: Set<number>,
  wrongCells?: Set<number>,
  allowBlockEditing?: boolean,
  autofill?: Array<string>,
}

export const GridView = ({ showingKeyboard, active, dispatch, grid, ...props}: GridViewProps) => {
  const entryCells = getEntryCells(grid, active);

  const noOp = React.useCallback(() => undefined, []);
  const changeActive = React.useCallback((pos) => {
    const a: SetActivePositionAction = {type: "SETACTIVEPOSITION", newActive: pos};
    dispatch(a);
  }, [dispatch]);
  const changeDirection = React.useCallback(() => dispatch({type: "CHANGEDIRECTION"}), [dispatch]);

  let cells = new Array<React.ReactNode>();
  for (let idx = 0; idx < grid.cells.length; idx += 1) {
    const cellValue = grid.cells[idx];
    const number = grid.cellLabels.get(idx);
    const isActive = cellIndex(grid, active) === idx;
    var onClick = changeActive;
    if (cellValue === BLOCK && !props.allowBlockEditing) {
      onClick = noOp;
    } else if (isActive) {
      onClick = changeDirection;
    }
    cells.push(<Cell
      autofill={props.autofill ? props.autofill[idx] : ''}
      showingKeyboard={showingKeyboard}
      gridWidth={grid.width}
      active={isActive}
      entryCell={entryCells.some((p) => cellIndex(grid, p) === idx)}
      key={idx}
      number={number ? number.toString() : ""}
      row={Math.floor(idx / grid.width)}
      column={idx % grid.width}
      onClick={onClick}
      value={cellValue}
      isBlock={cellValue === BLOCK}
      isVerified={props.verifiedCells?.has(idx)}
      isWrong={props.wrongCells?.has(idx)}
      wasRevealed={props.revealedCells?.has(idx)}
      highlight={grid.highlighted.has(idx) ? grid.highlight : undefined}
    />);
  }
  return <React.Fragment>{cells}</React.Fragment>;
}
