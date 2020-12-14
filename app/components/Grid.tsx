import { Dispatch, ReactNode, useCallback } from 'react';

import { PosAndDir, Position, BLOCK } from '../lib/types';
import { Cell } from './Cell';
import { PuzzleAction, SetActivePositionAction } from '../reducers/reducer';
import { ViewableGrid, ViewableEntry } from '../lib/viewableGrid';
import {
  cellIndex,
  getEntryCells,
  entryIndexAtPosition,
} from '../lib/gridBase';

type GridViewProps = {
  grid: ViewableGrid<ViewableEntry>;
  active: PosAndDir;
  dispatch: Dispatch<PuzzleAction>;
  revealedCells?: Set<number>;
  verifiedCells?: Set<number>;
  wrongCells?: Set<number>;
  allowBlockEditing?: boolean;
  autofill?: Array<string>;
  squareWidth: number;
  cellColors?: Array<number>;
  highlightEntry?: number;
  entryRefs?: Array<Set<number>>;
};

export const GridView = ({
  active,
  dispatch,
  grid,
  ...props
}: GridViewProps) => {
  const entryCells = getEntryCells(grid, active);
  const entryIdx = entryIndexAtPosition(grid, active);
  const highlightCells: Array<Position> =
    props.highlightEntry !== undefined
      ? grid.entries[props.highlightEntry]?.cells || []
      : [];
  let refedCells: Array<Position> = [];
  if (entryIdx !== null) {
    const refedCellsSet = new Set(entryCells);
    if (props.entryRefs) {
      props.entryRefs[entryIdx]?.forEach((refedEntryIdx) => {
        const refedEntry = grid.entries[refedEntryIdx];
        if (refedEntry) {
          refedEntry.cells.forEach((p) => refedCellsSet.add(p));
        }
      });
    }
    refedCells = [...refedCellsSet];
  }

  const noOp = useCallback(() => undefined, []);
  const changeActive = useCallback(
    (pos) => {
      const a: SetActivePositionAction = {
        type: 'SETACTIVEPOSITION',
        newActive: pos,
      };
      dispatch(a);
    },
    [dispatch]
  );
  const changeDirection = useCallback(
    () => dispatch({ type: 'CHANGEDIRECTION' }),
    [dispatch]
  );

  const cells = new Array<ReactNode>();
  for (const [idx, cellValue] of grid.cells.entries()) {
    const number = grid.cellLabels.get(idx);
    const isActive = cellIndex(grid, active) === idx;
    let onClick = changeActive;
    if (cellValue === BLOCK && !props.allowBlockEditing) {
      onClick = noOp;
    } else if (isActive) {
      onClick = changeDirection;
    }
    cells.push(
      <Cell
        squareWidth={props.squareWidth}
        autofill={props.autofill?.[idx] ?? ''}
        gridWidth={grid.width}
        gridHeight={grid.height}
        active={isActive}
        entryCell={entryCells.some((p) => cellIndex(grid, p) === idx)}
        refedCell={refedCells.some((p) => cellIndex(grid, p) === idx)}
        highlightCell={highlightCells.some((p) => cellIndex(grid, p) === idx)}
        key={idx}
        number={number ? number.toString() : ''}
        row={Math.floor(idx / grid.width)}
        column={idx % grid.width}
        onClick={onClick}
        value={cellValue}
        isBlock={cellValue === BLOCK}
        isVerified={props.verifiedCells?.has(idx)}
        isWrong={props.wrongCells?.has(idx)}
        wasRevealed={props.revealedCells?.has(idx)}
        highlight={grid.highlighted.has(idx) ? grid.highlight : undefined}
        cellColor={props.cellColors?.[idx]}
      />
    );
  }
  return <>{cells}</>;
};
