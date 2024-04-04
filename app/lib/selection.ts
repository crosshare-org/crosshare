import { Position, isSamePosition } from './types';

export interface GridSelection {
  start: Position;
  end: Position;
}

export function emptySelection(
  position: Position = { col: 0, row: 0 }
): GridSelection {
  return {
    start: { ...position },
    end: { ...position },
  };
}

export function hasMultipleCells(selection?: GridSelection): boolean {
  return !!selection && !isSamePosition(selection.start, selection.end);
}

export function forEachPosition(
  selection: GridSelection,
  callback: (position: Position) => void
): void {
  const { start, end } = selection;
  const startRow = Math.min(start.row, end.row);
  const endRow = Math.max(start.row, end.row);
  const startCol = Math.min(start.col, end.col);
  const endCol = Math.max(start.col, end.col);
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      callback({ row, col });
    }
  }
}

export function getSelectionCells(selection?: GridSelection): Position[] {
  const res: Position[] = [];
  if (hasMultipleCells(selection)) {
    forEachPosition(selection!, (pos) => res.push(pos));
  }
  return res;
}
