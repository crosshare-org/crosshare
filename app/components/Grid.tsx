import {
  Dispatch,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  cellIndex,
  entryIndexAtPosition,
  getEntryCells,
} from '../lib/gridBase.js';
import {
  GridSelection,
  getSelectionCells,
  hasMultipleCells,
} from '../lib/selection.js';
import {
  BLOCK,
  PosAndDir,
  Position,
  Symmetry,
  isSamePosition,
} from '../lib/types.js';
import { ViewableEntry, ViewableGrid, flipped } from '../lib/viewableGrid.js';
import {
  StartSelectionAction,
  UpdateSelectionAction,
} from '../reducers/builderReducer.js';
import { PuzzleAction } from '../reducers/commonActions.js';
import { SetActivePositionAction } from '../reducers/gridReducer.js';
import { Cell } from './Cell.js';

interface GridViewProps {
  grid: ViewableGrid<ViewableEntry>;
  defaultGrid?: ViewableGrid<ViewableEntry>; // This is used for the add alternate solution interface
  active: PosAndDir;
  dispatch: Dispatch<PuzzleAction>;
  revealedCells?: Set<number>;
  verifiedCells?: Set<number>;
  draftCells?: Set<number>;
  draftMode?: boolean;
  isEnteringRebus?: boolean;
  rebusValue?: string;
  wrongCells?: Set<number>;
  allowBlockEditing?: boolean;
  autofill?: string[];
  cellColors?: number[];
  entryRefs?: Set<number>[];
  showAlternates?: [number, string][][] | null;
  answers?: string[] | null;
  symmetry?: Symmetry | null;
  selection?: GridSelection;
}

export const GridView = ({
  active,
  dispatch,
  grid,
  ...props
}: GridViewProps) => {
  const entryCells = getEntryCells(grid, active);
  const entryIdx = entryIndexAtPosition(grid, active);
  const hasSelection = hasMultipleCells(props.selection);
  const selectedCells = getSelectionCells(props.selection);
  let refedCells: Position[] = [];
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
    return () => {
      clearInterval(interval);
    };
  }, [counter]);

  const noOp = useCallback(() => undefined, []);
  const changeActive = useCallback(
    (pos: Position, shiftKey: boolean) => {
      const a: SetActivePositionAction = {
        type: 'SETACTIVEPOSITION',
        newActive: pos,
        shiftKey,
      };
      dispatch(a);
    },
    [dispatch]
  );
  const changeDirection = useCallback(() => {
    dispatch({ type: 'CHANGEDIRECTION' });
  }, [dispatch]);
  const startSelection = useCallback(
    (position: Position) => {
      dispatch({ type: 'STARTSELECTION', position } as StartSelectionAction);
    },
    [dispatch]
  );
  const updateSelection = useCallback(
    (position: Position) => {
      dispatch({ type: 'UPDATESELECTION', position } as UpdateSelectionAction);
    },
    [dispatch]
  );

  // Touch-drag region selection (mobile equivalent of mouse-drag selection).
  // Only enabled for grids that support selection (i.e. the builder).
  const touchStartPos = useRef<Position | null>(null);
  const touchLastPos = useRef<Position | null>(null);
  const touchMoved = useRef(false);
  const selectionEnabled = props.selection !== undefined;
  const touchSelection = useMemo(() => {
    if (!selectionEnabled) {
      return undefined;
    }
    return {
      onTouchStart: (pos: Position) => {
        touchStartPos.current = pos;
        touchLastPos.current = pos;
        touchMoved.current = false;
      },
      onTouchMove: (clientX: number, clientY: number) => {
        const start = touchStartPos.current;
        const last = touchLastPos.current;
        if (!start || !last) {
          return;
        }
        const el = document
          .elementFromPoint(clientX, clientY)
          ?.closest<HTMLElement>('[data-row][data-col]');
        if (!el) {
          return;
        }
        const row = Number(el.dataset.row);
        const col = Number(el.dataset.col);
        if (Number.isNaN(row) || Number.isNaN(col)) {
          return;
        }
        const pos = { row, col };
        if (isSamePosition(pos, last)) {
          return;
        }
        if (!touchMoved.current) {
          touchMoved.current = true;
          dispatch({
            type: 'STARTSELECTION',
            position: start,
          } as StartSelectionAction);
        }
        touchLastPos.current = pos;
        dispatch({
          type: 'UPDATESELECTION',
          position: pos,
        } as UpdateSelectionAction);
      },
      onTouchEnd: () => {
        const moved = touchMoved.current;
        touchStartPos.current = null;
        touchLastPos.current = null;
        touchMoved.current = false;
        return moved;
      },
    };
  }, [selectionEnabled, dispatch]);

  let altToShow: string[] = [];
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

    const symmetricalCell =
      props.symmetry != Symmetry.None && props.symmetry != null
        ? flipped(grid, active, props.symmetry)
        : null;
    const isOpposite = !isActive && symmetricalCell === idx;
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
        entryCell={entryCells.some((p) => cellIndex(grid, p) === idx)}
        refedCell={refedCells.some((p) => cellIndex(grid, p) === idx)}
        selected={selectedCells.some((p) => cellIndex(grid, p) === idx)}
        isSelecting={hasSelection}
        key={idx}
        number={number ? number.toString() : ''}
        row={Math.floor(idx / grid.width)}
        column={idx % grid.width}
        onClick={onClick}
        onMouseDown={startSelection}
        onMouseEnter={updateSelection}
        touchSelection={touchSelection}
        value={toDisplay}
        isBlock={cellValue === BLOCK}
        isOpposite={isOpposite}
        isVerified={props.verifiedCells?.has(idx) || showAsVerified}
        isDraft={
          props.isEnteringRebus && isActive
            ? Boolean(props.draftMode)
            : props.draftCells?.has(idx)
        }
        isWrong={props.wrongCells?.has(idx)}
        wasRevealed={props.revealedCells?.has(idx)}
        styles={Array.from(grid.cellStyles.entries())
          .filter(([_style, cells]) => cells.has(idx))
          .map(([style, _cells]) => style)}
        cellColor={props.cellColors?.[idx]}
      />
    );
  }
  return <>{cells}</>;
};
