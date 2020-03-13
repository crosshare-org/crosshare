/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import axios from 'axios';
import { RouteComponentProps } from '@reach/router';
import { isMobile, isTablet } from "react-device-detect";
import { FaVolumeUp, FaVolumeMute, FaRegPlusSquare, FaPause, FaTabletAlt, FaKeyboard, FaEllipsisH, FaEye, FaCheck, FaCheckSquare } from 'react-icons/fa';
import { IoMdCloseCircleOutline, } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';

import { useTimer } from './timer';
import { Grid, Entry, GridData } from './Grid';
import { PosAndDir, Position, Direction, BLOCK, PuzzleJson } from './types';
import { TopBar, TopBarLink, TopBarDropDownLink, TopBarDropDown } from './TopBar';
import { Page, SquareAndCols, TinyNav } from './Page';
import { SECONDARY, LIGHTER, SMALL_AND_UP, KEYBOARD_HEIGHT } from './style'

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
  conceal: boolean,
  labelNumber: number,
  dispatch: React.Dispatch<ClickedEntryAction>,
  entryIndex: number,
  isActive: boolean,
  isCross: boolean,
  scrollToCross: boolean,
  direction: Direction,
  clue: string,
  isCompleted: boolean,
}
const ClueListItem = React.memo(({ isActive, isCross, ...props }: ClueListItemProps) => {
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
    props.dispatch({ type: 'CLICKEDENTRY', entryIndex: props.entryIndex });
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
        color: props.conceal ? 'transparent' : (props.isCompleted ? "#999" : "black"),
        textShadow: props.conceal ? '0 0 1em rgba(0,0,0,0.8)' : '',
      }}>{props.clue}</div>
    </li>
  );
});

const Overlay = (props: {closeCallback: () => void, showingKeyboard: boolean, children: React.ReactNode}) => {
  return (<div css={{
    position: 'fixed',
    backgroundColor: 'rgba(0,0,0,0.7)',
    top: 0,
    left: 0,
    width: '100%',
    height: props.showingKeyboard ? 'calc(100% - ' + KEYBOARD_HEIGHT + 'px)' : '100%',
    zIndex: 10000,
    textAlign: 'center'
  }}>
  <div css={{
    position: 'relative',
    display: 'flex',
    flexWrap: 'wrap',
    alignContent: 'center',
    alignItems: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '80%',
    padding: '3em 1em',
    backgroundColor: 'white',
    margin: '5em auto',
  }}>
  <button css={{
    background: 'white',
    border: 'none',
    position: 'absolute',
    padding: 0,
    fontSize: '3em',
    verticalAlign: 'text-top',
    width: '1em',
    height: '1em',
    top: 0,
    right: 0,
  }} onClick={props.closeCallback}><IoMdCloseCircleOutline css={{position: 'absolute', top: 0, right: 0 }}/></button>
  {props.children}
  </div>
  </div>);
};

const BeginPuzzleOverlay = (props: {dismiss: () => void}) => {
  return (
    <Overlay showingKeyboard={false} closeCallback={props.dismiss}>
      <h4 css={{width: '100%'}}>Ready to get started?</h4>
      <button onClick={props.dismiss}>Begin Puzzle</button>
    </Overlay>
  );
}

const PausedOverlay = (props: {dismiss: () => void}) => {
  return (
    <Overlay showingKeyboard={false} closeCallback={props.dismiss}>
      <h4 css={{width: '100%'}}>Your puzzle is paused</h4>
      <button onClick={props.dismiss}>Resume</button>
    </Overlay>
  );
}

const KeepTryingOverlay = ({dispatch}: {dispatch: React.Dispatch<PuzzleAction>}) => {
  return (
    <Overlay showingKeyboard={false} closeCallback={() => dispatch({type: "DISMISSKEEPTRYING"})}>
    <h4 css={{width: '100%'}}>Almost there!</h4>
    <p css={{width: '100%'}}>You've completed the puzzle, but there are one or more mistakes.</p>
    <button onClick={() => dispatch({type: "DISMISSKEEPTRYING"})}>Keep Trying</button>
    </Overlay>
  );
}

const SuccessOverlay = (props: {isMuted: boolean, unMuteCallback: () => void, solveTime: number, dispatch: React.Dispatch<PuzzleAction>}) => {
  return (
    <Overlay showingKeyboard={false} closeCallback={() => props.dispatch({type: "DISMISSSUCCESS"})}>
    <h4 css={{width: '100%'}}>Congratulations!</h4>
    <p css={{width: '100%'}}>You solved the puzzle in <b>{timeString(props.solveTime)}</b></p>
    {props.isMuted?
      <button onClick={props.unMuteCallback}><FaVolumeUp/> Unmute Success Music</button>
      :""
    }
    </Overlay>
  );
}

const RebusOverlay = (props: { showingKeyboard: boolean, value: string, dispatch: React.Dispatch<KeypressAction> }) => {
  return (
    <Overlay showingKeyboard={props.showingKeyboard} closeCallback={() => props.dispatch({ type: "KEYPRESS", key: 'Escape', shift: false })}>
        <div css={{
          color: props.value ? 'black' : '#999',
          margin: '0.5em 0',

          fontSize: '2.5em',
          lineHeight: '1em',
          width: '100%',
        }}>
          {props.value ? props.value : 'Enter Rebus'}
        </div>
        <button onClick={() => props.dispatch({ type: "KEYPRESS", key: 'Escape', shift: false })} css={{ marginBottom: '1em', width: '40%' }}>Cancel</button>
        <button onClick={() => props.dispatch({ type: "KEYPRESS", key: 'Enter', shift: false })} css={{ marginBottom: '1em', width: '40%' }}>Enter Rebus</button>
    </Overlay>
  );
}

interface ClueListProps {
  conceal: boolean,
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
      conceal={props.conceal}
      key={entry.index}
      scrollToCross={props.scrollToCross}
      labelNumber={entry.labelNumber}
      dispatch={props.dispatch}
      entryIndex={entry.index}
      isActive={props.current === entry.index}
      isCross={props.cross === entry.index}
      direction={entry.direction}
      isCompleted={entry.isComplete}
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

function usePersistedBoolean(key:string, defaultValue: boolean) {
  const [state, setState] = React.useState();

  React.useEffect(() => {
    const initialValue = localStorage.getItem(key);
    setState(initialValue !== null ? initialValue === "true" : defaultValue);
  }, []);

  const setStateAndPersist = (newValue: boolean) => {
    localStorage.setItem(key, newValue ? "true" : "false");
    setState(newValue);
  }
  return [state, setStateAndPersist];
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
  isEnteringRebus: boolean,
  rebusValue: string,
  success: boolean,
  filled: boolean,
  autocheck: boolean,
  dismissedKeepTrying: boolean,
  dismissedSuccess: boolean,
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

function cheatCells(state: PuzzleState, cellsToCheck: Array<Position>, isReveal: boolean) {
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
    } else if (isReveal) {
      newRevealed.add(cellIndex);
      newWrong.delete(cellIndex);
      newVerified.add(cellIndex);
      grid = grid.gridWithNewChar(cell, shouldBe);
    } else if (currentVal.trim()) {
      newWrong.add(cellIndex);
    }
  }
  return (checkComplete({ ...state, grid: grid, wrongCells: newWrong, revealedCells: newRevealed, verifiedCells: newVerified }));
}

function cheat(state: PuzzleState, cheatUnit: CheatUnit, isReveal: boolean) {
  let cellsToCheck: Array<Position> = [];
  if (cheatUnit === CheatUnit.Square) {
    cellsToCheck = [state.active];
  } else if (cheatUnit === CheatUnit.Entry) {
    const entry = state.grid.entryAtPosition(state.active)[0];
    if (!entry) { //block?
      return state;
    }
    cellsToCheck = entry.cells;
  } else if (cheatUnit === CheatUnit.Puzzle) {
    for (let rowidx = 0; rowidx < state.grid.height; rowidx += 1) {
      for (let colidx = 0; colidx < state.grid.width; colidx += 1) {
        cellsToCheck.push({ 'row': rowidx, 'col': colidx });
      }
    }
  }
  return cheatCells(state, cellsToCheck, isReveal);
}

function checkComplete(state: PuzzleState) {
  state.filled = true;
  state.success = true;
  for (let i = 0; i < state.grid.cells.length; i += 1) {
    if (state.grid.cells[i].trim() === '') {
      state.filled = false;
      state.success = false;
      break;
    }
    if (state.grid.cells[i] !== state.answers[i]) {
      state.success = false;
    }
  }
  return state;
}

function reducer(state: PuzzleState, action: PuzzleAction): PuzzleState {
  if (isCheatAction(action)) {
    return cheat(state, action.unit, action.isReveal === true);
  }
  if (action.type === "TOGGLEAUTOCHECK") {
    state = cheat(state, CheatUnit.Puzzle, false);
    return ({ ...state, autocheck: !state.autocheck });
  }
  if (action.type === "CHANGEDIRECTION") {
    return ({ ...state, active: { ...state.active, dir: (state.active.dir + 1) % 2 } });
  }
  if (action.type === "TOGGLEKEYBOARD") {
    return ({ ...state, showKeyboard: !state.showKeyboard });
  }
  if (action.type === "TOGGLETABLET") {
    return ({ ...state, isTablet: !state.isTablet });
  }
  if (action.type === "DISMISSKEEPTRYING") {
    return ({ ...state, dismissedKeepTrying: true });
  }
  if (action.type === "DISMISSSUCCESS") {
    return ({ ...state, dismissedSuccess: true });
  }
  if (isClickedEntryAction(action)) {
    const clickedEntry = state.grid.entries[action.entryIndex];
    for (let cell of clickedEntry.cells) {
      if (state.grid.valAt(cell) === " ") {
        return ({ ...state, active: { ...cell, dir: clickedEntry.direction } });
      }
    }
    return ({ ...state, active: { ...clickedEntry.cells[0], dir: clickedEntry.direction } });
  }
  if (isSetActiveAction(action)) {
    return ({ ...state, active: action.newActive });
  }
  if (isSetActivePositionAction(action)) {
    return ({ ...state, active: { ...action.newActive, dir: state.active.dir } });
  }
  if (isKeypressAction(action)) {
    const key = action.key;
    const shift = action.shift;
    if (key === '{num}' || key === '{abc}') {
      return ({ ...state, showExtraKeyLayout: !state.showExtraKeyLayout });
    }
    if (state.isEnteringRebus) {
      if (key.match(/^[A-Za-z0-9]$/)) {
        return ({ ...state, rebusValue: state.rebusValue + key.toUpperCase() });
      } else if (key === "Backspace" || key === "{bksp}") {
        return ({ ...state, rebusValue: state.rebusValue ? state.rebusValue.slice(0, -1) : "" });
      } else if (key === "Enter") {
        const cellIndex = state.grid.cellIndex(state.active);
        if (!state.verifiedCells.has(cellIndex) && !state.success) {
          state.grid = state.grid.gridWithNewChar(state.active, state.rebusValue);
          state.wrongCells.delete(cellIndex);
          if (state.autocheck) {
            state = cheat(state, CheatUnit.Square, false);
          }
          state = checkComplete(state);
        }
        return ({
          ...state,
          active: state.grid.advancePosition(state.active, state.wrongCells),
          isEnteringRebus: false, rebusValue: ''
        });
      } else if (key === "Escape") {
        return ({ ...state, isEnteringRebus: false, rebusValue: '' });
      }
      return state;
    }
    if (key === '{rebus}' || key === 'Escape') {
      return ({ ...state, showExtraKeyLayout: false, isEnteringRebus: true });
    } else if (key === " " || key === "{dir}") {
      return ({ ...state, active: { ...state.active, dir: (state.active.dir + 1) % 2 } });
    } else if (key === "{prev}") {
      return ({ ...state, active: state.grid.retreatPosition(state.active) });
    } else if (key === "{next}") {
      return ({ ...state, active: state.grid.advancePosition(state.active, state.wrongCells) });
    } else if ((key === "Tab" && !shift) || key === "{nextEntry}") {
      return ({ ...state, active: state.grid.moveToNextEntry(state.active) });
    } else if ((key === "Tab" && shift) || key === "{prevEntry}") {
      return ({ ...state, active: state.grid.moveToPrevEntry(state.active) });
    } else if (key === "ArrowRight") {
      return ({ ...state, active: { ...state.grid.moveRight(state.active), dir: Direction.Across } });
    } else if (key === "ArrowLeft") {
      return ({ ...state, active: { ...state.grid.moveLeft(state.active), dir: Direction.Across } });
    } else if (key === "ArrowUp") {
      return ({ ...state, active: { ...state.grid.moveUp(state.active), dir: Direction.Down } });
    } else if (key === "ArrowDown") {
      return ({ ...state, active: { ...state.grid.moveDown(state.active), dir: Direction.Down } });
    } else if (key === '.' && state.grid.allowBlockEditing) {
      return ({ ...state, grid: state.grid.gridWithBlockToggled(state.active) })
    } else if (key.match(/^[A-Za-z0-9]$/)) {
      const char = key.toUpperCase();
      const cellIndex = state.grid.cellIndex(state.active);
      if (!state.verifiedCells.has(cellIndex) && !state.success) {
        state.grid = state.grid.gridWithNewChar(state.active, char);
        state.wrongCells.delete(cellIndex);
        if (state.autocheck) {
          state = cheat(state, CheatUnit.Square, false);
        }
        state = checkComplete(state);
      }
      return ({
        ...state,
        active: state.grid.advancePosition(state.active, state.wrongCells),
      });
    } else if (key === "Backspace" || key === "{bksp}") {
      const cellIndex = state.grid.cellIndex(state.active);
      if (!state.verifiedCells.has(cellIndex) && !state.success) {
        state.grid = state.grid.gridWithNewChar(state.active, " ");
        state.filled = false;
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

function initialize(initialState: PuzzleState) {
  return { ...initialState, active: { ...initialState.grid.nextNonBlock(initialState.active), dir: Direction.Across } };
}

function timeString(elapsed: number): string {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed - (hours * 3600)) / 60);
  const seconds = Math.floor(elapsed - (hours * 3600) - (minutes * 60));
  return hours + ':' +
    (minutes < 10 ? "0" : "") + minutes + ':' +
    (seconds < 10 ? "0" : "") + seconds;
}

export const Puzzle = (props: PuzzleJson) => {
  const answers = props.grid;
  const [state, dispatch] = React.useReducer(reducer, {
    active: { col: 0, row: 0, dir: Direction.Across } as PosAndDir,
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
    isEnteringRebus: false,
    rebusValue: '',
    success: false,
    filled: false,
    autocheck: false,
    dismissedKeepTrying: false,
    dismissedSuccess: false,
  }, initialize);

  const [muted, setMuted] = usePersistedBoolean("muted", true);

  function physicalKeyboardHandler(e: React.KeyboardEvent) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    dispatch({ type: "KEYPRESS", key: e.key, shift: e.shiftKey } as KeypressAction);
    e.preventDefault();
  }
  useEventListener('keydown', physicalKeyboardHandler);

  const [playedAudio, setPlayedAudio] = React.useState(false);
  function playAudio() {
    new Audio(`${process.env.PUBLIC_URL}/success.mp3`).play();
  }
  if (state.success && !playedAudio) {
    setPlayedAudio(true);
    if (!muted) {
      playAudio();
    }
  }

  const [elapsed, isPaused, pause, resume] = useTimer();
  React.useEffect(() => {
    if (state.success) {
      pause();
    }
  }, [state.success, pause]);

  const [entry, cross] = state.grid.entryAndCrossAtPosition(state.active);

  const acrossEntries = state.grid.entries.filter((e) => e.direction === Direction.Across);
  const downEntries = state.grid.entries.filter((e) => e.direction === Direction.Down);

  function keyboardHandler(key: string) {
    dispatch({ type: "KEYPRESS", key: key, shift: false } as KeypressAction);
  }

  const showingKeyboard = state.showKeyboard && !state.success;
  return (
    <React.Fragment>
      <TopBar>
        <TopBarLink icon={<FaPause />} hoverText={"Pause Game"} text={timeString(elapsed)} onClick={pause} keepText={true} />
        <TopBarDropDown icon={<FaEye />} text="Reveal">
          <TopBarDropDownLink text="Reveal Square" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Square, isReveal: true } as CheatAction)} />
          <TopBarDropDownLink text="Reveal Entry" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Entry, isReveal: true } as CheatAction)} />
          <TopBarDropDownLink text="Reveal Puzzle" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Puzzle, isReveal: true } as CheatAction)} />
        </TopBarDropDown>
        {
          !state.autocheck ?
            (<TopBarDropDown icon={<FaCheck />} text="Check">
              <TopBarDropDownLink text="Autocheck" onClick={() => dispatch({ type: "TOGGLEAUTOCHECK" })} />
              <TopBarDropDownLink text="Check Square" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Square } as CheatAction)} />
              <TopBarDropDownLink text="Check Entry" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Entry } as CheatAction)} />
              <TopBarDropDownLink text="Check Puzzle" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Puzzle } as CheatAction)} />
            </TopBarDropDown>)
            :
            <TopBarLink icon={<FaCheckSquare />} text="Autochecking" onClick={() => dispatch({ type: "TOGGLEAUTOCHECK" })} />
        }
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          <TopBarDropDownLink icon={<FaRegPlusSquare />} text="Enter Rebus (Esc)" onClick={() => dispatch({ type: "KEYPRESS", key: 'Escape', shift: false } as KeypressAction)} />
          {
            muted ?
            <TopBarDropDownLink icon={<FaVolumeUp />} text="Unmute" onClick={() => setMuted(false)} />
            :
            <TopBarDropDownLink icon={<FaVolumeMute />} text="Mute" onClick={() => setMuted(true)} />
          }
          <TopBarDropDownLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={() => dispatch({ type: "TOGGLEKEYBOARD" })} />
          <TopBarDropDownLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={() => dispatch({ type: "TOGGLETABLET" })} />
        </TopBarDropDown>
      </TopBar>
      {state.isEnteringRebus ?
        <RebusOverlay showingKeyboard={showingKeyboard} dispatch={dispatch} value={state.rebusValue} /> : ""}
      {state.filled && !state.success && !state.dismissedKeepTrying ?
        <KeepTryingOverlay dispatch={dispatch}/>
      :""}
      {state.success && !state.dismissedSuccess ?
        <SuccessOverlay isMuted={muted} unMuteCallback={() => {setMuted(false);setPlayedAudio(true);playAudio();}} solveTime={elapsed} dispatch={dispatch}/>
      :""}
      {isPaused && !state.success ?
        (elapsed === 0 ?
          <BeginPuzzleOverlay dismiss={resume}/>
          :
          <PausedOverlay dismiss={resume}/>
        )
      :""}
      <SquareAndCols
        showKeyboard={showingKeyboard}
        keyboardHandler={keyboardHandler}
        showExtraKeyLayout={state.showExtraKeyLayout}
        isTablet={state.isTablet}
        square={
          <Grid
            showingKeyboard={showingKeyboard}
            grid={state.grid}
            active={state.active}
            dispatch={dispatch}
            revealedCells={state.revealedCells}
            verifiedCells={state.verifiedCells}
            wrongCells={state.wrongCells}
          />
        }
        left={<ClueList conceal={isPaused && !state.success} header="Across" entries={acrossEntries} current={entry.index} cross={cross.index} scrollToCross={true} dispatch={dispatch} />}
        right={<ClueList conceal={isPaused && !state.success} header="Down" entries={downEntries} current={entry.index} cross={cross.index} scrollToCross={true} dispatch={dispatch} />}
        tinyColumn={<TinyNav dispatch={dispatch}><ClueList conceal={isPaused && !state.success} entries={acrossEntries.concat(downEntries)} current={entry.index} cross={cross.index} scrollToCross={false} dispatch={dispatch} /></TinyNav>}
      />
    </React.Fragment>
  )
}
