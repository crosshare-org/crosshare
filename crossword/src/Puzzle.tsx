/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import axios from 'axios';
import { RouteComponentProps } from '@reach/router';
import { isMobile, isTablet } from "react-device-detect";
import { FaTabletAlt, FaKeyboard } from 'react-icons/fa';
import useEventListener from '@use-it/event-listener'

import { Grid, Entry, GridData } from './Grid';
import { PosAndDir, Position, Direction, BLOCK, PuzzleJson } from './types';
import { TopBar, TopBarLink } from './TopBar';
import { Page, SquareAndCols, TinyNav } from './Page';
import { SECONDARY, LIGHTER, SMALL_AND_UP } from './style'

interface PuzzleProps extends RouteComponentProps {
  crosswordId?: string
}

export const PuzzleLoader = ({ crosswordId }: PuzzleProps) => {
  const [puzzle, setPuzzle] = React.useState<PuzzleJson | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await axios(
          `${process.env.PUBLIC_URL}/demos/${crosswordId}.xw`
        );
        setPuzzle(result.data);
      } catch (error) {
        setIsError(true);
      }
      setIsLoaded(true);
    };
    fetchData();
  }, [crosswordId]);

  if (isError) {
    return <Page>Something went wrong while loading puzzle '{crosswordId}'</Page>;
  }
  if (!isLoaded || !puzzle) {
    return <Page>Loading '{crosswordId}'...</Page>
  }
  return <Puzzle {...puzzle} />
}

interface ClueListItemProps {
  labelNumber: number,
  dispatch: React.Dispatch<ClickedEntryAction>,
  entryIndex: number,
  isActive: boolean,
  isCross: boolean,
  scrollToCross: boolean,
  direction: Direction,
  clue: string,
}
const ClueListItem = React.memo(({isActive, isCross, ...props}: ClueListItemProps) => {
  const ref = React.useRef<HTMLLIElement>(null);
  if (ref.current) {
    if (isActive || (props.scrollToCross && isCross)) {
      ref.current.scrollIntoView({ behavior: "auto", block: "center" });
    }
  }
  function click(e: React.MouseEvent) {
    e.preventDefault();
    if (isActive) {
      return;
    }
    props.dispatch({type: 'CLICKEDENTRY', entryIndex: props.entryIndex});
  }
  return (
    <li css={{
      padding: '0.5em',
      backgroundColor: (isActive ? LIGHTER : (isCross ? SECONDARY : 'white')),
      listStyleType: 'none',
      cursor: (isActive ? 'default' : 'pointer'),
      '&:hover': {
        backgroundColor: (isActive ? LIGHTER : (isCross ? '#DDD' : '#EEE')),
      },
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'center',
      width: '100%',
    }} ref={ref} onClick={click} key={props.entryIndex}>
      <div css={{
        flexShrink: 0,
        width: '3em',
        height: '100%',
        fontWeight: 'bold',
        textAlign: 'right',
        padding: '0 0.5em',
      }}>{props.labelNumber}<span css={{
        [SMALL_AND_UP]: {
          display: 'none',
        },
      }}>{props.direction === Direction.Across ? 'A' : 'D'}</span>
      </div>
      <div css={{
        flex: '1 1 auto',
        height: '100%',
      }}>{props.clue}</div>
    </li>
  );
});

interface ClueListProps {
  header?: string,
  current: number,
  cross: number,
  entries: Array<Entry>,
  scrollToCross: boolean,
  dispatch: React.Dispatch<ClickedEntryAction>,
}
const ClueList = (props: ClueListProps) => {
  const clues = props.entries.map((entry) => {
    return (<ClueListItem
      key={entry.index}
      scrollToCross={props.scrollToCross}
      labelNumber={entry.labelNumber}
      dispatch={props.dispatch}
      entryIndex={entry.index}
      isActive={props.current === entry.index}
      isCross={props.cross === entry.index}
      direction={entry.direction}
      clue={entry.clue}
    />)
  });
  return (
    <div css={{
      height: "100% !important",
      position: 'relative',
    }}>{props.header ?
      <div css={{
        fontWeight: 'bold',
        borderBottom: '1px solid #AAA',
        height: '1.5em',
        paddingLeft: '0.5em',
      }}>{props.header}</div> : ""}
      <div css={{
        maxHeight: props.header ? 'calc(100% - 1.5em)' : '100%',
        overflowY: 'scroll',
      }}>
        <ol css={{
          margin: 0,
          padding: 0,
        }}>
          {clues}
        </ol>
      </div>
    </div>
  );
}

interface PuzzleState {
  active: PosAndDir,
  grid: GridData,
  showKeyboard: boolean,
  isTablet: boolean,
  showExtraKeyLayout: boolean,
}

export interface PuzzleAction {
  type: string,
}

export interface KeypressAction extends PuzzleAction {
  key: string,
  shift: boolean,
}
function isKeypressAction(action: PuzzleAction): action is KeypressAction {
  return action.type === 'KEYPRESS'
}

interface SetActiveAction extends PuzzleAction {
  newActive: PosAndDir,
}
function isSetActiveAction(action: PuzzleAction): action is SetActiveAction {
  return action.type === 'SETACTIVE'
}

interface ClickedEntryAction extends PuzzleAction {
  entryIndex: number,
}
function isClickedEntryAction(action: PuzzleAction): action is ClickedEntryAction {
  return action.type === 'CLICKEDENTRY'
}

export interface SetActivePositionAction extends PuzzleAction {
  newActive: Position,
}
function isSetActivePositionAction(action: PuzzleAction): action is SetActivePositionAction {
  return action.type === 'SETACTIVEPOSITION'
}

function reducer(state: PuzzleState, action: PuzzleAction): PuzzleState {
  if (action.type === "CHANGEDIRECTION") {
    return ({...state, active: {...state.active, dir: (state.active.dir + 1) % 2}});
  }
  if (action.type === "TOGGLEKEYBOARD") {
    return ({...state, showKeyboard: !state.showKeyboard});
  }
  if (action.type === "TOGGLETABLET") {
    return ({...state, isTablet: !state.isTablet});
  }
  if (isClickedEntryAction(action)) {
    const clickedEntry = state.grid.entries[action.entryIndex];
    for (let cell of clickedEntry.cells) {
      if (state.grid.valAt(cell) === " ") {
        return({...state, active: {...cell, dir: clickedEntry.direction}});
      }
    }
    return({...state, active: {...clickedEntry.cells[0], dir: clickedEntry.direction}});
  }
  if (isSetActiveAction(action)) {
    return ({...state, active: action.newActive});
  }
  if (isSetActivePositionAction(action)) {
    return ({...state, active: {...action.newActive, dir: state.active.dir}});
  }
  if (isKeypressAction(action)) {
    const key = action.key;
    const shift = action.shift;
    if (key === '{num}' || key === '{abc}') {
      return ({...state, showExtraKeyLayout: !state.showExtraKeyLayout});
    } else if (key === " " || key === "{dir}") {
      return ({...state, active: {...state.active, dir: (state.active.dir + 1) % 2}});
    } else if (key === "{prev}") {
      return ({...state, active: state.grid.retreatPosition(state.active)});
    } else if (key === "{next}") {
      return ({...state, active: state.grid.advancePosition(state.active)});
    } else if ((key === "Tab" && !shift) || key === "{nextEntry}") {
      return ({...state, active: state.grid.moveToNextEntry(state.active)});
    } else if ((key === "Tab" && shift) || key === "{prevEntry}") {
      return ({...state, active: state.grid.moveToPrevEntry(state.active)});
    } else if (key === "ArrowRight") {
      return ({...state, active: {...state.grid.moveRight(state.active), dir: Direction.Across}});
    } else if (key === "ArrowLeft") {
      return ({...state, active: {...state.grid.moveLeft(state.active), dir: Direction.Across}});
    } else if (key === "ArrowUp") {
      return ({...state, active: {...state.grid.moveUp(state.active), dir: Direction.Down}});
    } else if (key === "ArrowDown") {
      return ({...state, active: {...state.grid.moveDown(state.active), dir: Direction.Down}});
    } else if (key === '.' && state.grid.allowBlockEditing) {
      return ({...state, grid: state.grid.gridWithBlockToggled(state.active)})
    } else if (key.match(/^[A-Za-z0-9]$/)) {
      const char = key.toUpperCase();
      return ({
        ...state,
        grid: state.grid.gridWithNewChar(state.active, char),
        active: state.grid.advancePosition(state.active),
      });
    } else if (key === "Backspace" || key === "{bksp}") {
      return ({
        ...state,
        grid: state.grid.gridWithNewChar(state.active, " "),
        active: state.grid.retreatPosition(state.active),
      });
    }
  }
  return state;
}

export const Puzzle = (props: PuzzleJson) => {
  const answers = props.grid;
  const [state, dispatch] = React.useReducer(reducer, {
    active: {col: 0, row: 0, dir: Direction.Across} as PosAndDir,
    grid: GridData.fromCells(
      props.size.cols,
      props.size.rows,
      (answers.map((s) => s === BLOCK ? BLOCK : " ") as Array<string>),
      false,
      props.clues.across,
      props.clues.down,
    ),
    showKeyboard: isMobile,
    isTablet: isTablet,
    showExtraKeyLayout: false,
  });

  function physicalKeyboardHandler(e: React.KeyboardEvent) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    dispatch({type: "KEYPRESS", key: e.key, shift: e.shiftKey} as KeypressAction);
    e.preventDefault();
  }
  useEventListener('keydown', physicalKeyboardHandler);

  const [entry, cross] = state.grid.entryAndCrossAtPosition(state.active);

  const acrossEntries = state.grid.entries.filter((e) => e.direction === Direction.Across);
  const downEntries = state.grid.entries.filter((e) => e.direction === Direction.Down);

  function keyboardHandler(key: string) {
    dispatch({type: "KEYPRESS", key: key, shift: false} as KeypressAction);
  }

  return (
    <React.Fragment>
      <TopBar>
        <TopBarLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={() => dispatch({type: "TOGGLEKEYBOARD"})} />
        <TopBarLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={() => dispatch({type: "TOGGLETABLET"})} />
      </TopBar>
      <SquareAndCols
        showKeyboard={state.showKeyboard}
        keyboardHandler={keyboardHandler}
        showExtraKeyLayout={state.showExtraKeyLayout}
        isTablet={state.isTablet}
        square={
          <Grid
            showingKeyboard={state.showKeyboard}
            grid={state.grid}
            active={state.active}
            dispatch={dispatch}
          />
        }
        left={<ClueList header="Across" entries={acrossEntries} current={entry.index} cross={cross.index} scrollToCross={true} dispatch={dispatch}/>}
        right={<ClueList header="Down" entries={downEntries} current={entry.index} cross={cross.index} scrollToCross={true} dispatch={dispatch} />}
        tinyColumn={<TinyNav dispatch={dispatch}><ClueList entries={acrossEntries.concat(downEntries)} current={entry.index} cross={cross.index} scrollToCross={false} dispatch={dispatch} /></TinyNav>}
      />
    </React.Fragment>
  )
}
