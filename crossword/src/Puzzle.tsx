/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import axios from 'axios';
import { RouteComponentProps } from '@reach/router';
import { isMobile, isTablet } from "react-device-detect";
import { FaVolumeUp, FaVolumeMute, FaPause, FaTabletAlt, FaKeyboard, FaCheck, FaEye, FaEllipsisH, FaCheckSquare } from 'react-icons/fa';
import useEventListener from '@use-it/event-listener';

import { CheckSquare, RevealSquare, CheckEntry, RevealEntry, CheckPuzzle, RevealPuzzle, Rebus } from './Icons';
import { requiresAuth } from './App';
import { useTimer } from './timer';
import { Overlay } from './Overlay';
import { GridView } from './Grid';
import { ViewableEntry, fromCells } from './viewableGrid';
import { entryAndCrossAtPosition } from './gridBase';
import { PosAndDir, Direction, BLOCK, PuzzleJson } from './types';
import { cheat, checkComplete, puzzleReducer, advanceActiveToNonBlock, Symmetry, PuzzleAction, CheatUnit, CheatAction, KeypressAction, ClickedEntryAction } from './reducer';
import { TopBar, TopBarLink, TopBarDropDownLink, TopBarDropDown } from './TopBar';
import { Page, SquareAndCols, TinyNav } from './Page';
import { SECONDARY, LIGHTER, SMALL_AND_UP } from './style';


interface PuzzleLoaderProps extends RouteComponentProps {
  crosswordId?: string
}

export const PuzzleLoader = ({ crosswordId }: PuzzleLoaderProps) => {
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

export const RebusOverlay = (props: { showingKeyboard: boolean, value: string, dispatch: React.Dispatch<KeypressAction> }) => {
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
  entries: Array<ViewableEntry>,
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
  }, [defaultValue, key]);

  const setStateAndPersist = (newValue: boolean) => {
    localStorage.setItem(key, newValue ? "true" : "false");
    setState(newValue);
  }
  return [state, setStateAndPersist];
}

function timeString(elapsed: number): string {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed - (hours * 3600)) / 60);
  const seconds = Math.floor(elapsed - (hours * 3600) - (minutes * 60));
  return hours + ':' +
    (minutes < 10 ? "0" : "") + minutes + ':' +
    (seconds < 10 ? "0" : "") + seconds;
}

export function getKeyboardHandler(dispatch: React.Dispatch<PuzzleAction>) {
  return (key: string) => {
    dispatch({ type: "KEYPRESS", key: key, shift: false } as KeypressAction);
  }
}

export function getPhysicalKeyboardHandler(dispatch: React.Dispatch<PuzzleAction>) {
  return (e: React.KeyboardEvent) => {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    dispatch({ type: "KEYPRESS", key: e.key, shift: e.shiftKey } as KeypressAction);
    e.preventDefault();
  }
}

export const Puzzle = requiresAuth((props: PuzzleJson) => {
  const [state, dispatch] = React.useReducer(puzzleReducer, {
    active: { col: 0, row: 0, dir: Direction.Across } as PosAndDir,
    grid: fromCells(
      (e) => e,
      props.size.cols,
      props.size.rows,
      (props.grid.map((s) => s === BLOCK ? BLOCK : " ") as Array<string>),
      false,
      props.clues.across,
      props.clues.down,
      new Set(props.highlighted),
      props.highlight,
    ),
    showKeyboard: isMobile,
    isTablet: isTablet,
    showExtraKeyLayout: false,
    answers: props.grid,
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
    symmetry: Symmetry.None,
    isEditable(cellIndex) {return !this.verifiedCells.has(cellIndex) && !this.success},
    postEdit(cellIndex) {
      let state = this;
      state.wrongCells.delete(cellIndex);
      if (state.autocheck) {
        state = cheat(state, CheatUnit.Square, false);
      }
      return checkComplete(state);
    }
  }, advanceActiveToNonBlock);

  const [muted, setMuted] = usePersistedBoolean("muted", true);

  useEventListener('keydown', getPhysicalKeyboardHandler(dispatch));

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

  const [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
  if (entry === null || cross === null) {
    throw new Error("Null entry/cross while playing puzzle!");
  }

  const acrossEntries = state.grid.entries.filter((e) => e.direction === Direction.Across);
  const downEntries = state.grid.entries.filter((e) => e.direction === Direction.Down);

  const showingKeyboard = state.showKeyboard && !state.success;
  return (
    <React.Fragment>
      <TopBar>
        <TopBarLink icon={<FaPause />} hoverText={"Pause Game"} text={timeString(elapsed)} onClick={pause} keepText={true} />
        <TopBarDropDown icon={<FaEye />} text="Reveal">
          <TopBarDropDownLink icon={<RevealSquare/>} text="Reveal Square" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Square, isReveal: true } as CheatAction)} />
          <TopBarDropDownLink icon={<RevealEntry/>} text="Reveal Entry" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Entry, isReveal: true } as CheatAction)} />
          <TopBarDropDownLink icon={<RevealPuzzle/>} text="Reveal Puzzle" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Puzzle, isReveal: true } as CheatAction)} />
        </TopBarDropDown>
        {
          !state.autocheck ?
            (<TopBarDropDown icon={<FaCheck />} text="Check">
              <TopBarDropDownLink icon={<FaCheckSquare/>} text="Autocheck" onClick={() => dispatch({ type: "TOGGLEAUTOCHECK" })} />
              <TopBarDropDownLink icon={<CheckSquare/>} text="Check Square" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Square } as CheatAction)} />
              <TopBarDropDownLink icon={<CheckEntry/>} text="Check Entry" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Entry } as CheatAction)} />
              <TopBarDropDownLink icon={<CheckPuzzle/>} text="Check Puzzle" onClick={() => dispatch({ type: "CHEAT", unit: CheatUnit.Puzzle } as CheatAction)} />
            </TopBarDropDown>)
            :
            <TopBarLink icon={<FaCheckSquare />} text="Autochecking" onClick={() => dispatch({ type: "TOGGLEAUTOCHECK" })} />
        }
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          <TopBarDropDownLink icon={<Rebus />} text="Enter Rebus (Esc)" onClick={() => dispatch({ type: "KEYPRESS", key: 'Escape', shift: false } as KeypressAction)} />
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
        keyboardHandler={getKeyboardHandler(dispatch)}
        showExtraKeyLayout={state.showExtraKeyLayout}
        includeBlockKey={false}
        isTablet={state.isTablet}
        square={
          <GridView
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
});
