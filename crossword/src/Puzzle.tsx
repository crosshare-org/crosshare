/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import axios from 'axios';
import { navigate, RouteComponentProps } from '@reach/router';
import { isMobile, isTablet } from "react-device-detect";
import { FaGlasses, FaUser, FaVolumeUp, FaVolumeMute, FaPause, FaTabletAlt, FaKeyboard, FaCheck, FaEye, FaEllipsisH, FaCheckSquare } from 'react-icons/fa';
import useEventListener from '@use-it/event-listener';
import { Helmet } from "react-helmet-async";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { EscapeKey, CheckSquare, RevealSquare, CheckEntry, RevealEntry, CheckPuzzle, RevealPuzzle, Rebus } from './Icons';
import { requiresAuth, AuthProps, CrosshareAudioContext } from './App';
import { useTimer } from './timer';
import { Overlay } from './Overlay';
import { GridView } from './Grid';
import { CluedEntry, fromCells, addClues } from './viewableGrid';
import { entryAndCrossAtPosition } from './gridBase';
import { Direction, BLOCK, PuzzleV, PuzzleResult, PlayT, PlayV, puzzleTitle } from './types';
import {
  cheat, checkComplete, puzzleReducer, advanceActiveToNonBlock,
  PuzzleAction, CheatUnit, CheatAction, KeypressAction, ClickedEntryAction,
  ToggleAutocheckAction
} from './reducer';
import { TopBar, TopBarLink, TopBarDropDownLink, TopBarDropDown } from './TopBar';
import { Page, SquareAndCols, TinyNav } from './Page';
import { SECONDARY, LIGHTER, ERROR_COLOR, SMALL_AND_UP } from './style';
import { navToLatestMini, UpcomingMinisCalendar } from './UpcomingMinisCalendar';
import { usePersistedBoolean } from './hooks';
import { timeString } from './utils';

declare var firebase: typeof import('firebase');

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
        console.log("failed to pre-load");
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
  return <PuzzlePlayLoader {...puzzle} />
}

interface ClueListItemProps {
  conceal: boolean,
  labelNumber: number,
  dispatch: React.Dispatch<PuzzleAction>,
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
      props.dispatch({type: "CHANGEDIRECTION"});
      return;
    }
    const ca: ClickedEntryAction = { type: 'CLICKEDENTRY', entryIndex: props.entryIndex };
    props.dispatch(ca);
  }
  return (
    <li css={{
      padding: '0.5em',
      backgroundColor: (isActive ? LIGHTER : (isCross ? SECONDARY : 'white')),
      listStyleType: 'none',
      cursor: 'pointer',
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

const PrevDailyMiniLink = (props: {puzzle: PuzzleResult}) => {
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [finished, setFinished] = React.useState(false);

  function goToPrevious() {
    if (!props.puzzle.publishTime) {
      setError(true);
      return;
    }
    setLoading(true);
    navToLatestMini(props.puzzle.publishTime, ()=>{setError(true)}, ()=>{setFinished(true)});
  }
  if (error) {
    return <React.Fragment>Something went wrong while loading</React.Fragment>;
  }
  if (finished) {
    return <React.Fragment>End of the line, partner</React.Fragment>;
  }
  if (loading) {
    return <React.Fragment>Loading previous daily mini...</React.Fragment>;
  }
  return (<button  css={{
        background: 'none!important',
        border: 'none',
        padding: '0!important',
        color: '#069',
        fontWeight: 'bold',
        textDecoration: 'underline',
        cursor: 'pointer',
      }} onClick={goToPrevious}>Play the previous daily mini crossword</button>);
}

const SuccessOverlay = (props: {puzzle: PuzzleResult, isMuted: boolean, solveTime: number, dispatch: React.Dispatch<PuzzleAction>}) => {
  return (
    <Overlay showingKeyboard={false} closeCallback={() => props.dispatch({type: "DISMISSSUCCESS"})}>
    <h4 css={{width: '100%'}}>Congratulations!</h4>
    <p css={{width: '100%'}}>You solved the puzzle in <b>{timeString(props.solveTime)}</b></p>
    { props.puzzle.category === 'dailymini' ?
      <p css={{width: '100%'}}>
        <PrevDailyMiniLink puzzle={props.puzzle} />
      </p>
    : ""}
    </Overlay>
  );
}

export const RebusOverlay = (props: { getCurrentTime: ()=>number, showingKeyboard: boolean, value: string, dispatch: React.Dispatch<KeypressAction> }) => {
  return (
    <Overlay showingKeyboard={props.showingKeyboard} closeCallback={() => {
      const escape: KeypressAction = { elapsed: props.getCurrentTime(), type: "KEYPRESS", key: 'Escape', shift: false };
      props.dispatch(escape)
    }}>
        <div css={{
          color: props.value ? 'black' : '#999',
          margin: '0.5em 0',

          fontSize: '2.5em',
          lineHeight: '1em',
          width: '100%',
        }}>
          {props.value ? props.value : 'Enter Rebus'}
        </div>
        <button onClick={() => {
          const escape: KeypressAction = { elapsed: props.getCurrentTime(), type: "KEYPRESS", key: 'Escape', shift: false };
          props.dispatch(escape);
        }} css={{ marginBottom: '1em', width: '40%' }}>Cancel</button>
        <button onClick={() => {
          const enter: KeypressAction = { elapsed: props.getCurrentTime(), type: "KEYPRESS", key: 'Enter', shift: false };
          props.dispatch(enter);
        }} css={{ marginBottom: '1em', width: '40%' }}>Enter Rebus</button>
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
  dispatch: React.Dispatch<PuzzleAction>,
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

export function getKeyboardHandler(dispatch: React.Dispatch<PuzzleAction>, getCurrentTime: ()=>number) {
  return (key: string) => {
    const kpa: KeypressAction = { elapsed: getCurrentTime(), type: "KEYPRESS", key: key, shift: false };
    dispatch(kpa);
  }
}

export function getPhysicalKeyboardHandler(dispatch: React.Dispatch<PuzzleAction>, getCurrentTime: ()=>number) {
  return (e: React.KeyboardEvent) => {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    const kpa: KeypressAction = { elapsed: getCurrentTime(), type: "KEYPRESS", key: e.key, shift: e.shiftKey };
    dispatch(kpa);
    e.preventDefault();
  }
}

const PuzzlePlayLoader = requiresAuth((props: PuzzleResult & AuthProps) => {
  const [play, setPlay] = React.useState<PlayT | null>(null);
  const [isError, setIsError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const playData = localStorage.getItem("p/" + props.id + "-" + props.user.uid);
    if (playData) {
      console.log("loading play state from local storage");
      const validationResult = PlayV.decode(JSON.parse(playData));
      if (isRight(validationResult)) {
        setPlay(validationResult.right);
      } else {
        console.error(PathReporter.report(validationResult).join(","));
        setIsError(true);
      }
    } else {
      console.log("trying load from db");
      const db = firebase.firestore();
      db.collection("p").doc(props.id + "-" + props.user.uid).get().then((value) => {
        const data = value.data();
        if (data) {
          console.log("loaded play state from db");
          const validationResult = PlayV.decode(data);
          if (isRight(validationResult)) {
            setPlay(validationResult.right);
            localStorage.setItem("p/" + props.id + "-" + props.user.uid, JSON.stringify(validationResult.right));
          } else {
            console.error(PathReporter.report(validationResult).join(","));
            setIsError(true);
          }
        } else {
          setIsLoading(false);
        }
      });
    }
  }, [props.id, props.user.uid]);

  if (isError) {
    return <Page title={null}>Something went wrong while loading play history</Page>;
  }
  if (isLoading && play === null) {
    return <Page title={null}>Loading play history...</Page>
  }

  return <Puzzle play={play} {...props}/>
});

interface PlayProps {
  play: PlayT|null,
}
const Puzzle = requiresAuth(({play, ...props}: PuzzleResult & AuthProps & PlayProps) => {
  const [state, dispatch] = React.useReducer(puzzleReducer, {
    type: 'puzzle',
    active: { col: 0, row: 0, dir: Direction.Across },
    grid: addClues(fromCells({
      mapper: (e) => e,
      width: props.size.cols,
      height: props.size.rows,
      cells: play ? play.g : props.grid.map((s) => s === BLOCK ? BLOCK : " "),
      allowBlockEditing: false,
      highlighted: new Set(props.highlighted),
      highlight: props.highlight,
    }), props.clues),
    showKeyboard: isMobile,
    isTablet: isTablet,
    showExtraKeyLayout: false,
    answers: props.grid,
    verifiedCells: new Set<number>(play ? play.vc : []),
    wrongCells: new Set<number>(play ? play.wc : []),
    revealedCells: new Set<number>(play ? play.rc : []),
    isEnteringRebus: false,
    rebusValue: '',
    success: play ? play.f : false,
    filled: false,
    autocheck: false,
    dismissedKeepTrying: false,
    dismissedSuccess: false,
    moderating: false,
    didCheat: play ? play.ch : false,
    cellsUpdatedAt: play ? play.ct : props.grid.map(() => 0),
    cellsIterationCount: play ? play.uc : props.grid.map(() => 0),
    cellsEverMarkedWrong: new Set<number>(play ? play.we : []),
    isEditable(cellIndex) {return !this.verifiedCells.has(cellIndex) && !this.success},
    postEdit(cellIndex) {
      let state = this;
      state.wrongCells.delete(cellIndex);
      if (state.autocheck) {
        state = cheat(getCurrentTime(), state, CheatUnit.Square, false);
      }
      return checkComplete(state);
    }
  }, advanceActiveToNonBlock);

  const [muted, setMuted] = usePersistedBoolean("muted", false);

  let title = puzzleTitle(props);

  // Set up music player for success song
  const [audioContext, initAudioContext] = React.useContext(CrosshareAudioContext);
  const playSuccess = React.useRef<(() => void)|null>(null);
  React.useEffect(() => {
    if (!audioContext) {
      return initAudioContext();
    }
    if (!playSuccess.current && !muted && audioContext) {
      axios.get(`${process.env.PUBLIC_URL}/success.mp3`, {
        responseType: 'arraybuffer',
      }).then((response) => {
        audioContext.decodeAudioData(response.data, (audioBuffer) => {
          playSuccess.current = () => {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
          }
        });
      });
    }
  }, [muted, audioContext, initAudioContext]);
  const [playedAudio, setPlayedAudio] = React.useState(false);
  if (state.success && !playedAudio) {
    setPlayedAudio(true);
    if (!muted && playSuccess.current) {
      playSuccess.current();
    }
  }

  const [elapsed, isPaused, pause, resume, getCurrentTime] = useTimer(play ? play.t : 0);
  React.useEffect(() => {
    if (state.success) {
      pause();
    }
  }, [state.success, pause]);

  useEventListener('keydown', getPhysicalKeyboardHandler(dispatch, getCurrentTime));

  const [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
  if (entry === null || cross === null) {
    throw new Error("Null entry/cross while playing puzzle!");
  }

  const updatePlay = React.useCallback((sendToDB: boolean) => {
    const play: PlayT = {
      c: props.id,
      u: props.user.uid,
      n: title,
      ua: firebase.firestore.Timestamp.now(),
      g: state.grid.cells,
      ct: state.cellsUpdatedAt,
      uc: state.cellsIterationCount,
      vc: Array.from(state.verifiedCells),
      wc: Array.from(state.wrongCells),
      we: Array.from(state.cellsEverMarkedWrong),
      rc: Array.from(state.revealedCells),
      t: getCurrentTime(),
      ch: state.didCheat,
      f: state.success,
    }
    localStorage.setItem("p/" + props.id + "-" + props.user.uid, JSON.stringify(play));
    if (sendToDB) {
      console.log("Writing play to db");
      const db = firebase.firestore();
      db.collection("p").doc(props.id + "-" + props.user.uid).set(play).then(() => {
        console.log("Pushed update");
      });
    }
  }, [getCurrentTime, props.id, props.user.uid, state.cellsEverMarkedWrong,
      state.cellsIterationCount, state.cellsUpdatedAt, state.didCheat,
      state.grid.cells, state.revealedCells, state.success, state.verifiedCells,
      state.wrongCells, title]);

  const updatePlayRef = React.useRef(state.success ? null : updatePlay);
  // Any time any of the things we save update, write to local storage
  React.useEffect(() => {
    // Write through to firebase if first call after success
    const writeThrough = state.success && (updatePlayRef.current !== null);
    if (writeThrough) {
      console.log("Writing through to DB");
      updatePlay(true);
    } else if (!state.success){
      console.log("Writing to local storage");
      updatePlay(false);
    }
    if (state.success) {
      updatePlayRef.current = null;
    } else {
      updatePlayRef.current = updatePlay;
    }
  }, [updatePlay, state.success]);

  React.useEffect(() => {
    function handleBeforeUnload () {
      console.log("Doing before unload");
      if (updatePlayRef.current) {
        updatePlayRef.current(true);
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      console.log("Doing unmount update");
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (updatePlayRef.current) {
        updatePlayRef.current(true);
      }
    }
  }, [updatePlayRef]);

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
          <TopBarDropDownLink icon={<RevealSquare/>} text="Reveal Square" onClick={() => {
            const ca: CheatAction = { elapsed: getCurrentTime(), type: "CHEAT", unit: CheatUnit.Square, isReveal: true };
            dispatch(ca);
          }} />
          <TopBarDropDownLink icon={<RevealEntry/>} text="Reveal Word" onClick={() => {
            const ca: CheatAction = { elapsed: getCurrentTime(), type: "CHEAT", unit: CheatUnit.Entry, isReveal: true };
            dispatch(ca);
          }} />
          <TopBarDropDownLink icon={<RevealPuzzle/>} text="Reveal Puzzle" onClick={() => {
            const ca: CheatAction = { elapsed: getCurrentTime(), type: "CHEAT", unit: CheatUnit.Puzzle, isReveal: true };
            dispatch(ca);
          }} />
        </TopBarDropDown>
        {
          !state.autocheck ?
            (<TopBarDropDown icon={<FaCheck />} text="Check">
              <TopBarDropDownLink icon={<FaCheckSquare/>} text="Autocheck" onClick={() => {
                const action: ToggleAutocheckAction = { elapsed: getCurrentTime(), type: "TOGGLEAUTOCHECK" };
                dispatch(action);
              }} />
              <TopBarDropDownLink icon={<CheckSquare/>} text="Check Square" onClick={() => {
                const ca: CheatAction = { elapsed: getCurrentTime(), type: "CHEAT", unit: CheatUnit.Square };
                dispatch(ca);
              }} />
              <TopBarDropDownLink icon={<CheckEntry/>} text="Check Word" onClick={() => {
                const ca: CheatAction = { elapsed: getCurrentTime(), type: "CHEAT", unit: CheatUnit.Entry };
                dispatch(ca);
              }} />
              <TopBarDropDownLink icon={<CheckPuzzle/>} text="Check Puzzle" onClick={() => {
                const ca: CheatAction = { elapsed: getCurrentTime(), type: "CHEAT", unit: CheatUnit.Puzzle };
                dispatch(ca);
              }} />
            </TopBarDropDown>)
            :
            <TopBarLink icon={<FaCheckSquare />} text="Autochecking" onClick={() => {
              const action: ToggleAutocheckAction = { elapsed: getCurrentTime(), type: "TOGGLEAUTOCHECK" };
              dispatch(action);
            }} />
        }
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          <TopBarDropDownLink icon={<Rebus />} text="Enter Rebus" shortcutHint={<EscapeKey/>} onClick={() => {
            const kpa: KeypressAction = { elapsed: getCurrentTime(), type: "KEYPRESS", key: 'Escape', shift: false };
            dispatch(kpa);
          }} />
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
        <RebusOverlay getCurrentTime={getCurrentTime} showingKeyboard={showingKeyboard} dispatch={dispatch} value={state.rebusValue} /> : ""}
      {state.filled && !state.success && !state.dismissedKeepTrying ?
        <KeepTryingOverlay dispatch={dispatch}/>
      :""}
      {state.success && !state.dismissedSuccess ?
        <SuccessOverlay puzzle={props} isMuted={muted} solveTime={elapsed} dispatch={dispatch}/>
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
        keyboardHandler={getKeyboardHandler(dispatch, getCurrentTime)}
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
