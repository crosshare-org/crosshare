import {
  useReducer, useCallback, useMemo
} from 'react';
import useEventListener from '@use-it/event-listener';

import { ClueList } from './ClueList';
import { GridView } from './Grid';
import { entryAndCrossAtPosition } from '../lib/gridBase';
import { builderReducer, initialBuilderState, BuilderState, KeypressAction } from '../reducers/reducer';
import { SquareAndCols } from './Page';
import { Direction, PuzzleResult } from '../lib/types';
import { PuzzleStatsT } from '../lib/dbtypes';
import { fromCells, getClueMap } from '../lib/viewableGrid';
import { useMatchMedia } from '../lib/hooks';
import { SMALL_AND_UP_RULES } from '../lib/style';

export enum StatsMode {
  AverageTime,
  AverageEditCount
}

interface PuzzleStatsProps {
  puzzle: PuzzleResult,
  stats: PuzzleStatsT,
  mode: StatsMode
}

const initializeState = (props: PuzzleStatsProps): BuilderState => {
  const viewableGrid = fromCells({
    cells: props.puzzle.grid, width: props.puzzle.size.cols, height: props.puzzle.size.rows,
    allowBlockEditing: false,
    highlighted: new Set<number>(), highlight: 'circle',
    mapper: (e) => e
  });

  return initialBuilderState({
    id: props.puzzle.id,
    width: props.puzzle.size.cols,
    height: props.puzzle.size.rows,
    grid: props.puzzle.grid,
    highlighted: props.puzzle.highlighted,
    highlight: props.puzzle.highlight,
    title: props.puzzle.title,
    notes: props.puzzle.constructorNotes,
    clues: getClueMap(viewableGrid, props.puzzle.clues),
    authorId: props.puzzle.authorId,
    authorName: props.puzzle.authorName,
    editable: false,
    isPrivate: false,
    isPrivateUntil: null,
  });
};

export const PuzzleStats = (props: PuzzleStatsProps): JSX.Element => {
  const [state, dispatch] = useReducer(builderReducer, props, initializeState);

  const physicalKeyboardHandler = useCallback((e: KeyboardEvent) => {
    const tagName = (e.target as HTMLElement) ?.tagName ?.toLowerCase();
    if (tagName === 'textarea' || tagName === 'input') {
      return;
    }
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    const kpa: KeypressAction = { type: 'KEYPRESS', key: e.key, shift: e.shiftKey };
    dispatch(kpa);
    e.preventDefault();
  }, [dispatch]);
  useEventListener('keydown', physicalKeyboardHandler);

  let [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
  if (entry === null) {
    if (cross !== null) {
      dispatch({ type: 'CHANGEDIRECTION' });
      [entry, cross] = [cross, entry];
    }
  }

  const { acrossEntries, downEntries } = useMemo(() => {
    const cluedEntries = state.grid.entries.map((e) => ({ ...e, clue: e.completedWord ? state.clues[e.completedWord] : '' }));
    return {
      acrossEntries: cluedEntries.filter((e) => e.direction === Direction.Across),
      downEntries: cluedEntries.filter((e) => e.direction === Direction.Down)
    };
  }, [state.grid.entries, state.clues]);

  const normalizedColors = useMemo(() => {
    const data = props.mode === StatsMode.AverageTime ? props.stats.ct : props.stats.uc;
    const max = Math.max(...data);
    const min = Math.min(...data.filter(v => v));

    return data.map(v => (max - min) ? (v - min) / (max - min) : 0);
  }, [props.stats.ct, props.stats.uc, props.mode]);

  const scrollToCross = useMatchMedia(SMALL_AND_UP_RULES);

  return <SquareAndCols
    aspectRatio={state.grid.width / state.grid.height}
    dispatch={dispatch}
    square={
      (width: number, _height: number) => {
        return <GridView
          squareWidth={width}
          grid={state.grid}
          cellColors={normalizedColors}
          active={state.active}
          dispatch={dispatch}
          allowBlockEditing={true}
        />;
      }
    }
    left={<ClueList wasEntryClick={state.wasEntryClick} dimCompleted={false} active={state.active} grid={state.grid} showEntries={false} conceal={false} header="Across" entries={acrossEntries} current={entry ?.index} cross={cross ?.index} scrollToCross={scrollToCross} dispatch={dispatch} />}
    right={<ClueList wasEntryClick={state.wasEntryClick} dimCompleted={false} active={state.active} grid={state.grid} showEntries={false} conceal={false} header="Down" entries={downEntries} current={entry ?.index} cross={cross ?.index} scrollToCross={scrollToCross} dispatch={dispatch} />}
  />;
};
