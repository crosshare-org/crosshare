import { Dispatch, ReactNode, useCallback, useEffect, useState } from 'react';

import { PosAndDir, Position, BLOCK, Symmetry } from '../lib/types';
import { Cell } from './Cell';
import { PuzzleAction, SetActivePositionAction } from '../reducers/reducer';
import { ViewableGrid, ViewableEntry, flipped } from '../lib/viewableGrid';
import {
  cellIndex,
  getEntryCells,
  entryIndexAtPosition,
} from '../lib/gridBase';

type GridViewProps = {
  grid: ViewableGrid<ViewableEntry>;
  defaultGrid?: ViewableGrid<ViewableEntry>; // This is used for the add alternate solution interface
  active: PosAndDir;
  dispatch: Dispatch<PuzzleAction>;
  revealedCells?: Set<number>;
  verifiedCells?: Set<number>;
  isEnteringRebus?: boolean;
  rebusValue?: string;
  wrongCells?: Set<number>;
  allowBlockEditing?: boolean;
  autofill?: Array<string>;
  cellColors?: Array<number>;
  highlightEntry?: number;
  entryRefs?: Array<Set<number>>;
  showAlternates?: Array<Array<[number, string]>> | null;
  answers?: Array<string> | null;
  symmetry?: Symmetry | null;
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

  // We use this counter to rotate through possible correct grids
  // when there are multiple solutions
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCounter(counter + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [counter]);

  const noOp = useCallback(() => undefined, []);
  const changeActive = useCallback(
    (pos: Position) => {
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

  let altToShow: Array<string> = [];
  if (props.answers && props.showAlternates?.length) {
    altToShow = [...props.answers];
    const altIndex = counter % (props.showAlternates.length + 1);
    if (altIndex > 0) {
      props.showAlternates[altIndex - 1]?.forEach(([n, s]) => {
        altToShow[n] = s;
      });
    }
  }

  const cells = new Array<ReactNode>();
  for (const [idx, cellValue] of grid.cells.entries()) {
    const defaultCellValue = props.defaultGrid?.cells[idx];
    const number = grid.cellLabels.get(idx);
    const isActive = cellIndex(grid, active) === idx;
    let onClick = changeActive;
    if (cellValue === BLOCK && !props.allowBlockEditing) {
      onClick = noOp;
    } else if (isActive) {
      onClick = changeDirection;
    }
    let toDisplay = cellValue;
    let showAsVerified = false;
    if (defaultCellValue) {
      if (cellValue.trim() && cellValue.trim() != defaultCellValue.trim()) {
        showAsVerified = true;
      } else {
        toDisplay = defaultCellValue;
      }
    }
    if (altToShow.length) {
      toDisplay = altToShow[idx] || toDisplay;
    }

    const col = idx % grid.width;
    const row = Math.floor(idx / grid.height);

    const entryCell = entryCells.some((p) => cellIndex(grid, p) === idx);
    const symmetricalCell = (props.symmetry != Symmetry.None) ? flipped(grid, active, props.symmetry as Symmetry) : null;
    const isOpposite = !isActive && (symmetricalCell === idx)
    
    cells.push(
      <Cell
        barRight={grid.vBars.has(idx)}
        barBottom={grid.hBars.has(idx)}
        hidden={grid.hidden.has(idx)}
        hiddenRight={col < grid.width - 1 && grid.hidden.has(idx + 1)}
        hiddenBottom={
          row < grid.height - 1 && grid.hidden.has(idx + grid.width)
        }
        isEnteringRebus={props.isEnteringRebus || false}
        rebusValue={props.rebusValue}
        autofill={props.autofill?.[idx] ?? ''}
        gridWidth={grid.width}
        gridHeight={grid.height}
        active={isActive}
        entryCell={entryCell}
        refedCell={refedCells.some((p) => cellIndex(grid, p) === idx)}
        highlightCell={highlightCells.some((p) => cellIndex(grid, p) === idx)}
        key={idx}
        number={number ? number.toString() : ''}
        row={Math.floor(idx / grid.width)}
        column={idx % grid.width}
        onClick={onClick}
        value={toDisplay}
        isBlock={cellValue === BLOCK}
        isOpposite={isOpposite}
        isVerified={props.verifiedCells?.has(idx) || showAsVerified}
        isWrong={props.wrongCells?.has(idx)}
        wasRevealed={props.revealedCells?.has(idx)}
        highlight={grid.highlighted.has(idx) ? grid.highlight : undefined}
        cellColor={props.cellColors?.[idx]}
      />
    );
  }
  return <>{cells}</>;
};
