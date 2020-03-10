/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import axios from 'axios';
import { RouteComponentProps } from '@reach/router';
import { isMobile, isTablet } from "react-device-detect";
import { FaPause, FaTabletAlt, FaKeyboard, FaCog, FaEye, FaCheckDouble } from 'react-icons/fa';
import useEventListener from '@use-it/event-listener';

import { useTimer } from './timer';
import { Grid, Entry, GridData } from './Grid';
import { PosAndDir, Position, Direction, BLOCK, PuzzleJson } from './types';
import { TopBar, TopBarLink, TopBarDropDownLink, TopBarDropDown } from './TopBar';
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
  answers: Array<string>,
  verifiedCells: Set<number>,
  wrongCells: Set<number>,
  revealedCells: Set<number>,
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

enum CheatUnit {
  Square,
  Entry,
  Puzzle
}
export interface CheatAction extends PuzzleAction {
  unit: CheatUnit,
  isReveal?: boolean,
}
function isCheatAction(action: PuzzleAction): action is CheatAction {
  return action.type === 'CHEAT'
}

function reducer(state: PuzzleState, action: PuzzleAction): PuzzleState {
  if (isCheatAction(action)) {
    let cellsToCheck: Array<Position> = [];
    if (action.unit === CheatUnit.Square) {
      cellsToCheck = [state.active];
    } else if (action.unit === CheatUnit.Entry) {
      const entry = state.grid.entryAtPosition(state.active)[0];
      if (!entry) { //block?
        return state;
      }
      cellsToCheck = entry.cells;
    } else if (action.unit === CheatUnit.Puzzle) {
      for (let rowidx = 0; rowidx < state.grid.height; rowidx += 1) {
        for (let colidx = 0; colidx < state.grid.width; colidx += 1) {
          cellsToCheck.push({'row': rowidx, 'col': colidx});
        }
      }
    }
    const newRevealed = new Set(state.revealedCells);
    const newVerified = new Set(state.verifiedCells);
    const newWrong = new Set(state.wrongCells);
    let grid = state.grid;

    for (const cell of cellsToCheck) {
      const cellIndex = state.grid.cellIndex(cell);
      const shouldBe = state.answers[cellIndex];
      if (shouldBe === BLOCK) {
        continue;
      }
      const currentVal = state.grid.valAt(cell);
      if (shouldBe === currentVal) {
        newVerified.add(cellIndex);
      } else if (action.isReveal) {
        newRevealed.add(cellIndex);
        newWrong.delete(cellIndex);
        newVerified.add(cellIndex);
        grid = grid.gridWithNewChar(cell, shouldBe);
      } else if (currentVal.trim()) {
        newWrong.add(cellIndex);
      }
    }
    return ({...state, grid: grid, wrongCells: newWrong, revealedCells: newRevealed, verifiedCells: newVerified});
  }
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
      return ({...state, active: state.grid.advancePosition(state.active, state.wrongCells)});
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
      const cellIndex = state.grid.cellIndex(state.active);
      if (!state.verifiedCells.has(cellIndex)) {
        state.grid = state.grid.gridWithNewChar(state.active, char);
      }
      state.wrongCells.delete(cellIndex);
      return ({
        ...state,
        active: state.grid.advancePosition(state.active, state.wrongCells),
      });
    } else if (key === "Backspace" || key === "{bksp}") {
      const cellIndex = state.grid.cellIndex(state.active);
      if (!state.verifiedCells.has(cellIndex)) {
        state.grid = state.grid.gridWithNewChar(state.active, " ");
      }
      state.wrongCells.delete(cellIndex);
      return ({
        ...state,
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
      new Set(props.highlighted),
      props.highlight,
    ),
    showKeyboard: isMobile,
    isTablet: isTablet,
    showExtraKeyLayout: false,
    answers: answers,
    verifiedCells: new Set<number>(),
    wrongCells: new Set<number>(),
    revealedCells: new Set<number>(),
  });

  function physicalKeyboardHandler(e: React.KeyboardEvent) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    dispatch({type: "KEYPRESS", key: e.key, shift: e.shiftKey} as KeypressAction);
    e.preventDefault();
  }
  useEventListener('keydown', physicalKeyboardHandler);

  const [elapsed, isPaused, pause, resume] = useTimer();
  if (isPaused) {
    if (elapsed === 0) {
      return <Page>Your crossword is loaded and ready to begin! <button onClick={resume}>Start Puzzle</button></Page>;
    }
    return <Page>Your game is paused. <button onClick={resume}>Resume</button></Page>;
  }

  const [entry, cross] = state.grid.entryAndCrossAtPosition(state.active);

  const acrossEntries = state.grid.entries.filter((e) => e.direction === Direction.Across);
  const downEntries = state.grid.entries.filter((e) => e.direction === Direction.Down);

  function keyboardHandler(key: string) {
    dispatch({type: "KEYPRESS", key: key, shift: false} as KeypressAction);
  }

  function timeString(elapsed: number): string {
    const hours   = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed - (hours * 3600)) / 60);
    const seconds = Math.floor(elapsed - (hours * 3600) - (minutes * 60));
    return hours + ':' +
      (minutes < 10 ? "0" : "") + minutes + ':' +
      (seconds < 10 ? "0" : "") + seconds;
  }

  return (
    <React.Fragment>
      <TopBar>
        <TopBarLink icon={<FaPause/>} hoverText={"Pause Game"} text={timeString(elapsed)} onClick={pause} keepText={true} />
        <TopBarDropDown icon={<FaEye/>} text="Reveal">
          <TopBarDropDownLink text="Reveal Square" onClick={() => dispatch({type: "CHEAT", unit: CheatUnit.Square, isReveal: true} as CheatAction)} />
          <TopBarDropDownLink text="Reveal Entry" onClick={() => dispatch({type: "CHEAT", unit: CheatUnit.Entry, isReveal: true} as CheatAction)} />
          <TopBarDropDownLink text="Reveal Puzzle" onClick={() => dispatch({type: "CHEAT", unit: CheatUnit.Puzzle, isReveal: true} as CheatAction)} />
        </TopBarDropDown>
        <TopBarDropDown icon={<FaCheckDouble/>} text="Check">
          <TopBarDropDownLink text="Check Square" onClick={() => dispatch({type: "CHEAT", unit: CheatUnit.Square} as CheatAction)} />
          <TopBarDropDownLink text="Check Entry" onClick={() => dispatch({type: "CHEAT", unit: CheatUnit.Entry} as CheatAction)} />
          <TopBarDropDownLink text="Check Puzzle" onClick={() => dispatch({type: "CHEAT", unit: CheatUnit.Puzzle} as CheatAction)} />
        </TopBarDropDown>
        <TopBarDropDown icon={<FaCog />} text="Settings">
          <TopBarDropDownLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={() => dispatch({type: "TOGGLEKEYBOARD"})} />
          <TopBarDropDownLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={() => dispatch({type: "TOGGLETABLET"})} />
        </TopBarDropDown>
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
            revealedCells={state.revealedCells}
            verifiedCells={state.verifiedCells}
            wrongCells={state.wrongCells}
          />
        }
        left={<ClueList header="Across" entries={acrossEntries} current={entry.index} cross={cross.index} scrollToCross={true} dispatch={dispatch}/>}
        right={<ClueList header="Down" entries={downEntries} current={entry.index} cross={cross.index} scrollToCross={true} dispatch={dispatch} />}
        tinyColumn={<TinyNav dispatch={dispatch}><ClueList entries={acrossEntries.concat(downEntries)} current={entry.index} cross={cross.index} scrollToCross={false} dispatch={dispatch} /></TinyNav>}
      />
    </React.Fragment>
  )
}
