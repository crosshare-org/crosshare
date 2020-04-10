/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { navigate, RouteComponentProps } from '@reach/router';
import { isMobile, isTablet } from "react-device-detect";
import { FaGlasses, FaUser, FaVolumeUp, FaVolumeMute, FaPause, FaTabletAlt, FaKeyboard, FaCheck, FaEye, FaEllipsisH, FaCheckSquare } from 'react-icons/fa';
import useEventListener from '@use-it/event-listener';
import { Helmet } from "react-helmet-async";
import firebase from 'firebase/app';
import 'firebase/firestore';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { EscapeKey, CheckSquare, RevealSquare, CheckEntry, RevealEntry, CheckPuzzle, RevealPuzzle, Rebus } from './Icons';
import { requiresAuth, AuthProps } from './App';
import { useTimer } from './timer';
import { Overlay } from './Overlay';
import { GridView } from './Grid';
import { CluedEntry, fromCells, addClues } from './viewableGrid';
import { entryAndCrossAtPosition } from './gridBase';
import { PosAndDir, Direction, BLOCK, PuzzleV, PuzzleResult } from './types';
import { cheat, checkComplete, puzzleReducer, advanceActiveToNonBlock, Symmetry, PuzzleAction, CheatUnit, CheatAction, KeypressAction, ClickedEntryAction } from './reducer';
import { TopBar, TopBarLink, TopBarDropDownLink, TopBarDropDown } from './TopBar';
import { Page, SquareAndCols, TinyNav } from './Page';
import { SECONDARY, LIGHTER, ERROR_COLOR, SMALL_AND_UP } from './style';
import { UpcomingMinisCalendar } from './UpcomingMinisCalendar';
import { usePersistedBoolean } from './hooks';


interface PuzzleLoaderProps extends RouteComponentProps {
  crosswordId?: string
}

export const PuzzleLoader = ({ crosswordId, ...props }: PuzzleLoaderProps) => {
  const [puzzle, setPuzzle] = React.useState<PuzzleResult | null>(null);
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    if (!crosswordId) {
      throw new Error("missing id");
    }
    if (props.location?.state) {
      const validationResult = PuzzleV.decode(props.location.state);
      if (isRight(validationResult)) {
        console.log("puzzle pre-loaded");
        setPuzzle({...validationResult.right, id: crosswordId});
        return;
      } else {
        console.log("tried to pre-load but failed:");
        console.error(PathReporter.report(validationResult).join(","));
      }
    }
    console.log("loading puzzle");
    if (isError) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    db.collection("crosswords").doc(crosswordId).get().then((value) => {
      const data = value.data();
      if (!data) {
        setIsError(true);
      } else {
        const validationResult = PuzzleV.decode(data);
        if (isRight(validationResult)) {
          setPuzzle({...validationResult.right, id: crosswordId});
        } else {
          console.error(PathReporter.report(validationResult).join(","));
          setIsError(true);
        }
      }
    }).catch((reason) => {
      console.error(reason);
      setIsError(true);
    })
  }, [crosswordId, isError, props.location]);

  if (isError) {
    return <Page title={null}>Something went wrong while loading puzzle '{crosswordId}'</Page>;
  }
  if (puzzle === null) {
    return <Page title={null}>Loading '{crosswordId}'...</Page>
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

interface PauseBeginProps {
  title: string,
  authorName: string,
  dismiss: () => void,
  message: string,
  dismissMessage: string,
  moderated: boolean,
  publishTime: Date|undefined,
}

const BeginPauseOverlay = (props: PauseBeginProps) => {
  let warnings:Array<React.ReactNode> = [];
  if (!props.moderated) {
    warnings.push(<div key="moderation">The puzzle is awaiting moderation. We'll get to it ASAP! If you feel it's taking too long please message us on the google group.</div>);
  }
  if (props.publishTime && props.publishTime > new Date()) {
    warnings.push(<div key="publishtime">The puzzle has been scheduled for publishing on {props.publishTime.toLocaleDateString()}</div>)
  }
  return (
    <Overlay showingKeyboard={false} closeCallback={props.dismiss}>
      {warnings.length?
        <div css={{
          width: '100%',
          fontWeight: 'bold',
          border: '1px solid ' + ERROR_COLOR,
          borderRadius: '4px',
          margin: '1em',
          padding: '1em',
          color: ERROR_COLOR
        }}>
        <div>Your puzzle isn't visible to others yet:</div>
        {warnings}
        </div>
        :
        ""
      }
      <h3>{props.title} by {props.authorName}</h3>
      <h4 css={{width: '100%'}}>{props.message}</h4>
      <button onClick={props.dismiss}>{props.dismissMessage}</button>
    </Overlay>
  );
}

const ModeratingOverlay = ({dispatch, puzzle}: {puzzle: PuzzleResult, dispatch: React.Dispatch<PuzzleAction>}) => {
  const db = firebase.firestore();
  const [date, setDate] = React.useState(puzzle.publishTime?.toDate());

  function schedule() {
    if (!date) {
      throw new Error("shouldn't be able to schedule w/o date");
    }
    db.collection('crosswords').doc(puzzle.id).update({
      moderated: true,
      publishTime: firebase.firestore.Timestamp.fromDate(date),
      category: 'dailymini',
    }).then(() => {
      console.log("Scheduled mini");
      navigate("", {state: undefined});
    })
  }
  const isMini = puzzle.size.rows === 5 && puzzle.size.cols === 5

  return (
    <Overlay showingKeyboard={false} closeCallback={() => dispatch({type: "TOGGLEMODERATING"})}>
    <h4 css={{width: '100%'}}>Moderate this Puzzle</h4>
    <div>{puzzle.moderated ? "Puzzle has been approved" : "Puzzle is not approved"}</div>
    {isMini ?
      <div>
        <div>Pick a date for this mini to appear:</div>
        <UpcomingMinisCalendar disableExisting={true} value={date} onChange={setDate} />
        <div><button disabled={!date} onClick={schedule}>Schedule</button></div>
      </div>
      :
      <div>Not supported for non-minis yet.</div>
    }
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
  entries: Array<CluedEntry>,
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
      isCompleted={entry.completedWord !== null}
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

export const Puzzle = requiresAuth((props: PuzzleResult & AuthProps) => {
  const [state, dispatch] = React.useReducer(puzzleReducer, {
    active: { col: 0, row: 0, dir: Direction.Across } as PosAndDir,
    grid: addClues(fromCells({
      mapper: (e) => e,
      width: props.size.cols,
      height: props.size.rows,
      cells: (props.grid.map((s) => s === BLOCK ? BLOCK : " ") as Array<string>),
      allowBlockEditing: false,
      highlighted: new Set(props.highlighted),
      highlight: props.highlight,
    }), props.clues),
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
    moderating: false,
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

  let title = props.title;
  if (props.category === 'dailymini' && props.publishTime) {
    title = "Daily Mini for " + props.publishTime.toDate().toLocaleDateString();
  }

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
  const beginPauseProps = {authorName: props.authorName, title: title, dismiss: resume, moderated: props.moderated, publishTime: props.publishTime?.toDate()};
  return (
    <React.Fragment>
      <Helmet>
        <title>{title}</title>
      </Helmet>
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
          <TopBarDropDownLink icon={<Rebus />} text="Enter Rebus" shortcutHint={<EscapeKey/>} onClick={() => dispatch({ type: "KEYPRESS", key: 'Escape', shift: false } as KeypressAction)} />
          {
            muted ?
            <TopBarDropDownLink icon={<FaVolumeUp />} text="Unmute" onClick={() => setMuted(false)} />
            :
            <TopBarDropDownLink icon={<FaVolumeMute />} text="Mute" onClick={() => setMuted(true)} />
          }
          {
            props.isAdmin ?
            <React.Fragment>
              <TopBarDropDownLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={() => dispatch({ type: "TOGGLEKEYBOARD" })} />
              <TopBarDropDownLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={() => dispatch({ type: "TOGGLETABLET" })} />
              <TopBarDropDownLink icon={<FaGlasses />} text="Moderate" onClick={() => dispatch({ type: "TOGGLEMODERATING" })} />
            </React.Fragment>
            :""
          }
          <TopBarDropDownLink icon={<FaUser/>} text="Account" onClick={() => navigate('/account')}/>
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
      {state.moderating ?
        <ModeratingOverlay puzzle={props} dispatch={dispatch}/>
      :""}
      {isPaused && !state.success ?
        (elapsed === 0 ?
          <BeginPauseOverlay dismissMessage="Begin Puzzle" message="Ready to get started?" {...beginPauseProps}/>
          :
          <BeginPauseOverlay dismissMessage="Resume" message="Your puzzle is paused" {...beginPauseProps}/>
        )
      :""}
      <SquareAndCols
        muted={muted}
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
