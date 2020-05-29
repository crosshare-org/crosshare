import {
  useReducer, useState, useEffect, useCallback, useMemo, useRef, useContext,
  KeyboardEvent, Dispatch, memo, ReactNode
} from 'react';
import Head from 'next/head';
import {
  FaListOl, FaGlasses, FaUser, FaVolumeUp, FaVolumeMute, FaPause, FaTabletAlt,
  FaKeyboard, FaCheck, FaEye, FaEllipsisH, FaCheckSquare, FaUserLock,
} from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';
import { toast } from 'react-toastify';

import { Link } from './Link';
import { ClueList } from './ClueList';
import {
  EscapeKey, CheckSquare, RevealSquare, CheckEntry, RevealEntry, CheckPuzzle,
  RevealPuzzle, Rebus, SpinnerFinished
} from './Icons';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { AuthPropsOptional } from './AuthContext';
import { CrosshareAudioContext } from './CrosshareAudioContext';
import { Overlay } from './Overlay';
import { GridView } from './Grid';
import { Position, Direction, BLOCK, PuzzleResult, puzzleTitle } from '../lib/types';
import { fromCells, addClues } from '../lib/viewableGrid';
import { valAt, entryAndCrossAtPosition } from '../lib/gridBase';

import {
  PlayWithoutUserT, PlayWithoutUserV, PlayV, getDateString, UserPlayT, UserPlaysV, CategoryIndexV
} from '../lib/dbtypes';
import { getFromSessionOrDB, setInCache, updateInCache } from '../lib/dbUtils';
import {
  cheat, checkComplete, puzzleReducer, advanceActiveToNonBlock,
  PuzzleAction, CheatUnit, CheatAction, KeypressAction,
  ToggleAutocheckAction, ToggleClueViewAction
} from '../reducers/reducer';
import { TopBar, TopBarLink, TopBarDropDownLink, TopBarDropDownLinkA, TopBarDropDown } from './TopBar';
import { SquareAndCols, TwoCol, TinyNav } from './Page';
import { ERROR_COLOR } from '../lib/style';
import { usePersistedBoolean } from '../lib/hooks';
import { timeString } from '../lib/utils';
import { UpcomingMinisCalendar } from './UpcomingMinisCalendar';
import { App, DeleteSentinal, TimestampClass } from '../lib/firebaseWrapper';
import { Emoji } from './Emoji';
import { Comments } from './Comments';

export interface NextPuzzleLink {
  puzzleId: string,
  linkText: string
}

interface PauseBeginProps {
  loadingPlayState: boolean,
  title: string,
  authorName: string,
  dispatch: Dispatch<PuzzleAction>,
  message: string,
  dismissMessage: string,
  moderated: boolean,
  publishTime: Date | undefined,
}

const BeginPauseOverlay = (props: PauseBeginProps) => {
  const warnings: Array<ReactNode> = [];
  if (!props.moderated) {
    warnings.push(<div key="moderation">The puzzle is awaiting moderation. We&apos;ll get to it ASAP! If you feel it&apos;s taking too long please message us on the google group.</div>);
  }
  if (props.publishTime && props.publishTime > new Date()) {
    warnings.push(<div key="publishtime">The puzzle has been scheduled for publishing on {props.publishTime.toLocaleDateString()}</div>);
  }
  return (
    <Overlay closeCallback={props.loadingPlayState ? undefined : () => props.dispatch({ type: 'RESUMEACTION' })}>
      <div css={{ textAlign: 'center' }}>
        {warnings.length ?
          <div css={{
            width: '100%',
            fontWeight: 'bold',
            border: '1px solid ' + ERROR_COLOR,
            borderRadius: '4px',
            margin: '1em',
            padding: '1em',
            color: ERROR_COLOR
          }}>
            <div>Your puzzle isn&apos;t visible to others yet:</div>
            {warnings}
          </div>
          :
          ''
        }
        <h3>{props.title}</h3>
        <h4>by {props.authorName}</h4>
        {props.loadingPlayState ?
          <div>Checking for previous play data...</div>
          :
          <>
            <div css={{ marginBottom: '1em' }}>{props.message}</div>
            <button onClick={() => props.dispatch({ type: 'RESUMEACTION' })}>{props.dismissMessage}</button>
          </>
        }
      </div>
    </Overlay>
  );
};

const ModeratingOverlay = memo(({ dispatch, puzzle }: { puzzle: PuzzleResult, dispatch: Dispatch<PuzzleAction> }) => {
  const db = App.firestore();
  const [date, setDate] = useState(puzzle.publishTime ? new Date(puzzle.publishTime) : undefined);

  function schedule() {
    if (!date) {
      throw new Error('shouldn\'t be able to schedule w/o date');
    }
    const update: { [k: string]: string | firebase.firestore.FieldValue } = {
      [getDateString(date)]: puzzle.id,
    };
    if (puzzle.publishTime) {
      update[getDateString(new Date(puzzle.publishTime))] = DeleteSentinal;
    }
    db.collection('categories').doc('dailymini').update(update).then(() => {
      console.log('Updated categories page');
      // Dump it!
      sessionStorage.removeItem('categories/dailymini');
    });
    db.collection('c').doc(puzzle.id).update({
      m: true,
      p: TimestampClass.fromDate(date),
      c: 'dailymini',
    }).then(() => {
      console.log('Scheduled mini');
      // Dump it!
      sessionStorage.removeItem('c/' + puzzle.id);
      window.location.reload();
    });
  }
  const isMini = puzzle.size.rows === 5 && puzzle.size.cols === 5;

  function setModerated() {
    db.collection('c').doc(puzzle.id).update({
      m: true
    }).then(() => {
      // Dump it!
      sessionStorage.removeItem('c/' + puzzle.id);
      window.location.reload();
    });
  }

  return (
    <Overlay closeCallback={() => dispatch({ type: 'TOGGLEMODERATING' })}>
      <h4>Moderate this Puzzle</h4>
      <div>{puzzle.moderated ? 'Puzzle has been approved' : 'Puzzle is not approved'}</div>
      {isMini ?
        <div>
          {puzzle.publishTime ?
            <div>Scheduled for {(new Date(puzzle.publishTime)).toLocaleDateString()}</div>
            :
            ''
          }
          <div css={{ marginTop: '1em' }}>Pick a date for this mini to appear:</div>
          <UpcomingMinisCalendar disableExisting={true} value={date} onChange={setDate} />
          <div css={{ marginTop: '1em' }}><button disabled={!date} onClick={schedule}>Schedule As Daily Mini</button></div>
        </div>
        :
        ''
      }
      <button css={{ marginTop: '2em' }} disabled={puzzle.moderated} onClick={setModerated}>Approve Puzzle</button>
    </Overlay>
  );
});

const KeepTryingOverlay = ({ dispatch }: { dispatch: Dispatch<PuzzleAction> }) => {
  return (
    <Overlay closeCallback={() => dispatch({ type: 'DISMISSKEEPTRYING' })}>
      <h4><Emoji symbol='🤔' /> Almost there!</h4>
      <p>You&apos;ve completed the puzzle, but there are one or more mistakes.</p>
      <button css={{ width: '100%' }} onClick={() => dispatch({ type: 'DISMISSKEEPTRYING' })}>Keep Trying</button>
    </Overlay>
  );
};

const PrevDailyMiniLink = ({ nextPuzzle }: { nextPuzzle?: NextPuzzleLink }) => {
  if (!nextPuzzle) {
    return <>End of the line, partner</>;
  }
  return (<Link href='/crosswords/[puzzleId]' as={`/crosswords/${nextPuzzle.puzzleId}`} passHref>Play {nextPuzzle.linkText}</Link>);
};

const SuccessOverlay = (props: { user?: firebase.User, puzzle: PuzzleResult, nextPuzzle?: NextPuzzleLink, isMuted: boolean, solveTime: number, didCheat: boolean, dispatch: Dispatch<PuzzleAction> }) => {
  return (
    <Overlay closeCallback={() => props.dispatch({ type: 'DISMISSSUCCESS' })}>
      <div css={{ textAlign: 'center' }}>
        <h4><Emoji symbol='🎉' /> Congratulations! <Emoji symbol='🎊' /></h4>
        <p>You solved the puzzle in <b>{timeString(props.solveTime, false)}</b></p>
        {!props.user || props.user.isAnonymous ?
          <>
            <p>Sign in with google to track your puzzle solving streak!</p>
            {props.user ?
              <GoogleLinkButton user={props.user} />
              :
              <GoogleSignInButton />
            }
          </>
          : (props.puzzle.category === 'dailymini' ?
            <div>
              <PrevDailyMiniLink nextPuzzle={props.nextPuzzle} />
            </div>
            : '')
        }
      </div>
      <Comments user={props.user} solveTime={props.solveTime} didCheat={props.didCheat} puzzleId={props.puzzle.id} puzzleAuthorId={props.puzzle.authorId} comments={props.puzzle.comments} />
    </Overlay>
  );
};

export const RebusOverlay = (props: { value: string, dispatch: Dispatch<KeypressAction> }) => {
  return (
    <Overlay showKeyboard closeCallback={() => {
      const escape: KeypressAction = { type: 'KEYPRESS', key: 'Escape', shift: false };
      props.dispatch(escape);
    }}>
      <div css={{
        color: props.value ? 'var(--black)' : 'var(--default-text)',
        margin: '0.5em 0',
        textAlign: 'center',
        fontSize: '2.5em',
        lineHeight: '1em',
      }}>
        {props.value ? props.value : 'Type to enter rebus...'}
      </div>
      <button onClick={() => {
        const escape: KeypressAction = { type: 'KEYPRESS', key: 'Escape', shift: false };
        props.dispatch(escape);
      }} css={{ marginRight: '10%', width: '45%' }}>Cancel</button>
      <button
        disabled={props.value.length === 0}
        onClick={() => {
          const enter: KeypressAction = { type: 'KEYPRESS', key: 'Enter', shift: false };
          props.dispatch(enter);
        }} css={{ width: '45%' }}>Submit Rebus</button>
    </Overlay>
  );
};

interface PuzzleProps {
  puzzle: PuzzleResult,
  play: PlayWithoutUserT | null,
  loadingPlayState: boolean,
  nextPuzzle?: NextPuzzleLink
}
export const Puzzle = ({ loadingPlayState, puzzle, play, ...props }: PuzzleProps & AuthPropsOptional) => {
  const [state, dispatch] = useReducer(puzzleReducer, {
    type: 'puzzle',
    active: { col: 0, row: 0, dir: Direction.Across },
    grid: addClues(fromCells({
      mapper: (e) => e,
      width: puzzle.size.cols,
      height: puzzle.size.rows,
      cells: play ? play.g : puzzle.grid.map((s) => s === BLOCK ? BLOCK : ' '),
      allowBlockEditing: false,
      highlighted: new Set(puzzle.highlighted),
      highlight: puzzle.highlight,
    }), puzzle.clues),
    showExtraKeyLayout: false,
    answers: puzzle.grid,
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
    displaySeconds: play ? play.t : 0,
    bankedSeconds: play ? play.t : 0,
    currentTimeWindowStart: 0,
    didCheat: play ? play.ch : false,
    clueView: false,
    cellsUpdatedAt: play ? play.ct : puzzle.grid.map(() => 0),
    cellsIterationCount: play ? play.uc : puzzle.grid.map(() => 0),
    cellsEverMarkedWrong: new Set<number>(play ? play.we : []),
    isEditable(cellIndex) { return !this.verifiedCells.has(cellIndex) && !this.success; },
    postEdit(cellIndex) {
      let state = this; // eslint-disable-line @typescript-eslint/no-this-alias
      state.wrongCells.delete(cellIndex);
      if (state.autocheck) {
        state = cheat(state, CheatUnit.Square, false);
      }
      return checkComplete(state);
    }
  }, advanceActiveToNonBlock);

  // Every (unpaused) second dispatch a tick action which updates the display time
  useEffect(() => {
    function tick() {
      if (state.currentTimeWindowStart) {
        dispatch({ type: 'TICKACTION' });
      }
    }
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.currentTimeWindowStart, dispatch]);

  // Pause when page goes out of focus
  function prodPause() {
    if (process.env.NODE_ENV !== 'development') {
      dispatch({ type: 'PAUSEACTION' });
    }
  }
  useEventListener('blur', prodPause);

  const [muted, setMuted] = usePersistedBoolean('muted', false);

  const title = puzzleTitle(puzzle);

  // Set up music player for success song
  const [audioContext, initAudioContext] = useContext(CrosshareAudioContext);
  const playSuccess = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!audioContext) {
      return initAudioContext();
    }
    if (!playSuccess.current && !muted && audioContext) {
      fetch(`${process.env.PUBLIC_URL}/success.mp3`)
        .then(response => response.arrayBuffer())
        .then((buffer) => {
          audioContext.decodeAudioData(buffer, (audioBuffer) => {
            playSuccess.current = () => {
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              source.start();
            };
          });
        });
    }
  }, [muted, audioContext, initAudioContext]);
  const [ranSuccessEffects, setRanSuccessEffects] = useState(state.success);
  if (state.success && !ranSuccessEffects) {
    setRanSuccessEffects(true);
    let delay = 0;
    if (puzzle.size.rows === 5 && puzzle.size.cols === 5 && state.bankedSeconds <= 60) {
      toast(<div><Emoji symbol='🤓' /> You solved a mini puzzle in under a minute!</div>);
      delay += 500;
    }
    if (props.user) {
      Promise.all([
        getFromSessionOrDB({ collection: 'categories', docId: 'dailymini', validator: CategoryIndexV, ttl: 24 * 60 * 60 * 1000 }),
        getFromSessionOrDB({ collection: 'up', docId: props.user.uid, localDocId: '', validator: UserPlaysV, ttl: -1 })
      ])
        .then(([minis, plays]) => {
          // Check to see if we should show X daily minis in a row notification
          let consecutiveDailyMinis = 0;
          let dateToTest = new Date();
          dateToTest.setHours(12);
          let ds = getDateString(dateToTest);
          if (puzzle.id === minis ?.[ds] && !state.didCheat) {
            for (; ;) {
              consecutiveDailyMinis += 1;
              dateToTest.setDate(dateToTest.getDate() - 1);
              ds = getDateString(dateToTest);
              const play = plays ?.[minis[ds]];
              if (!play) {
                break;
              }
              const playDate = play[0].toDate();
              playDate.setHours(12);
              // cheated || didn't finish || played on wrong date
              if (play[2] || !play[3] || getDateString(playDate) !== ds) {
                break;
              }
            }
          }
          if (consecutiveDailyMinis === 1) {
            toast(<div><Emoji symbol='🥇' /> Solved the daily mini without check/reveal! </div>,
              { delay: delay });
            delay += 500;
          } else if (consecutiveDailyMinis) {
            toast(<div><Emoji symbol='🥇' /> Solved the daily mini without check/reveal <b>{consecutiveDailyMinis} days in a row!</b> <Emoji symbol='😻' /></div>,
              { delay: delay });
            delay += 500;
          }

          // Check to see if this is the first puzzle solved today
          let firstOfTheDay = true;
          let consecutiveSolveDays = 0;
          dateToTest = new Date();
          dateToTest.setHours(12);
          ds = getDateString(dateToTest);
          if (plays) {
            for (const [puzzleId, play] of Object.entries(plays)) {
              if (puzzleId === puzzle.id) {
                continue;
              }
              const playDate = play[0].toDate();
              playDate.setHours(12);
              if (play[3] && getDateString(playDate) === ds) {
                firstOfTheDay = false;
              }
            }
            if (firstOfTheDay) {
              for (; ;) {
                consecutiveSolveDays += 1;
                dateToTest.setDate(dateToTest.getDate() - 1);
                ds = getDateString(dateToTest);
                let solvedOne = false;
                for (const play of Object.values(plays)) {
                  const playDate = play[0].toDate();
                  playDate.setHours(12);
                  if (play[3] && getDateString(playDate) === ds) {
                    solvedOne = true;
                    break;
                  }
                }
                if (!solvedOne) {
                  break;
                }
              }
            }
          }
          if (consecutiveSolveDays > 1) {
            toast(<div><Emoji symbol='🔥' /> You finished a puzzle <b>{consecutiveSolveDays} days in a row!</b> Keep it up! <Emoji symbol='🔥' /></div>,
              { delay: delay });
          }
        });
    }
    if (!muted && playSuccess.current) {
      playSuccess.current();
    }
  }

  const physicalKeyboardHandler = useCallback((e: KeyboardEvent) => {
    // disable keyboard when paused / loading play
    if (loadingPlayState || !state.currentTimeWindowStart) {
      return;
    }
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
  }, [dispatch, loadingPlayState, state.currentTimeWindowStart]);
  useEventListener('keydown', physicalKeyboardHandler);

  let [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
  if (entry === null) {
    if (cross === null) {
      throw new Error('Null entry and cross while playing puzzle!');
    } else {
      dispatch({ type: 'CHANGEDIRECTION' });
      [entry, cross] = [cross, entry];
    }
  }

  const playState = useRef<PlayWithoutUserT>();
  useEffect(() => {
    if (loadingPlayState) {
      playState.current = undefined;
      return;
    }
    if (!playState.current && play) {
      playState.current = play;
      return;
    }
    const updatedAt = TimestampClass.now();
    const playTime = (state.currentTimeWindowStart === 0) ?
      state.bankedSeconds :
      state.bankedSeconds + ((new Date()).getTime() - state.currentTimeWindowStart) / 1000;

    playState.current = {
      c: puzzle.id,
      ua: updatedAt,
      g: Array.from(state.grid.cells),
      ct: Array.from(state.cellsUpdatedAt),
      uc: Array.from(state.cellsIterationCount),
      vc: Array.from(state.verifiedCells),
      wc: Array.from(state.wrongCells),
      we: Array.from(state.cellsEverMarkedWrong),
      rc: Array.from(state.revealedCells),
      t: playTime,
      ch: state.didCheat,
      f: state.success,
    };
  }, [loadingPlayState, play, puzzle.id, state.cellsEverMarkedWrong,
    state.cellsIterationCount, state.cellsUpdatedAt, state.didCheat,
    state.grid.cells, state.revealedCells, state.success, state.verifiedCells,
    state.wrongCells, title, state.bankedSeconds, state.currentTimeWindowStart]);

  const shouldUpdatePlaysInCache = useRef(state.success ? false : true);
  const currentPlayCacheState = useRef<PlayWithoutUserT | null>(null);
  useEffect(() => {
    if (!playState.current) {
      return;
    }
    const currentPlayState = playState.current;
    if (!shouldUpdatePlaysInCache.current) {
      return;
    }
    if (currentPlayState.f) {
      // We've finished so we should do this update and then no more
      shouldUpdatePlaysInCache.current = false;
    }
    if (currentPlayCacheState.current === currentPlayState) {
      return;
    }
    const userPlay: UserPlayT = [
      currentPlayState.ua,
      currentPlayState.t,
      currentPlayState.ch,
      currentPlayState.f,
      title];
    Promise.all([
      setInCache({
        collection: 'p',
        localDocId: puzzle.id,
        value: currentPlayState,
        validator: PlayWithoutUserV,
        sendToDB: false
      }),
      updateInCache({
        collection: 'up',
        localDocId: '',
        update: { [puzzle.id]: userPlay },
        validator: UserPlaysV,
        sendToDB: false
      })
    ]).then(() => {
      currentPlayCacheState.current = currentPlayState;
    });
  }, [puzzle.id, playState.current, title]); // eslint-disable-line react-hooks/exhaustive-deps

  const shouldUpdatePlaysInDB = useRef(state.success ? false : true);
  const currentPlayDBState = useRef<PlayWithoutUserT | null>(null);
  const writePlayToDBIfNeeded = useCallback(async () => {
    if (!playState.current) {
      return;
    }
    const currentPlayState = playState.current;
    if (!props.user) {
      return;
    }
    if (!shouldUpdatePlaysInDB.current) {
      return;
    }
    if (currentPlayState.f) {
      // We've finished so we should do this update and then no more
      shouldUpdatePlaysInDB.current = false;
    }
    if (currentPlayDBState.current === currentPlayState) {
      return;
    }
    const userPlay: UserPlayT = [
      currentPlayState.ua,
      currentPlayState.t,
      currentPlayState.ch,
      currentPlayState.f,
      title];
    return Promise.all([
      setInCache({
        collection: 'p',
        docId: puzzle.id + '-' + props.user.uid,
        localDocId: puzzle.id,
        value: { ...currentPlayState, u: props.user.uid },
        validator: PlayV,
        sendToDB: true
      }),
      updateInCache({
        collection: 'up',
        docId: props.user.uid,
        localDocId: '',
        update: { [puzzle.id]: userPlay },
        validator: UserPlaysV,
        sendToDB: true
      })]).then(() => { console.log('Finished writing play state to db'); });
  }, [props.user, puzzle.id, title]);

  useEffect(() => {
    return () => {
      writePlayToDBIfNeeded();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // useEffect(() => {
  //   function handleBeforeUnload() {
  //     console.log("Doing before unload");
  //     if (shouldUpdatePlays.current) {
  //       const updateplay = updatePlayRef.current;
  //       (async () => await updateplay(true))();
  //     }
  //   }
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //
  //   return () => {
  //     console.log("Doing unmount update");
  //     window.removeEventListener('beforeunload', handleBeforeUnload)
  //     if (updatePlayRef.current) {
  //       const updateplay = updatePlayRef.current;
  //       (async () => await updateplay(true))();
  //     }
  //   }
  // }, [shouldUpdatePlays]);

  const keyboardHandler = useCallback((key: string) => {
    const kpa: KeypressAction = { type: 'KEYPRESS', key: key, shift: false };
    dispatch(kpa);
  }, [dispatch]);

  const acrossEntries = state.grid.entries.filter((e) => e.direction === Direction.Across);
  const downEntries = state.grid.entries.filter((e) => e.direction === Direction.Down);

  const beginPauseProps = { loadingPlayState: loadingPlayState, authorName: puzzle.authorName, title: title, dispatch: dispatch, moderated: puzzle.moderated, publishTime: (puzzle.publishTime ? new Date(puzzle.publishTime) : undefined) };

  let puzzleView: ReactNode;

  const ourValAt = useCallback((p: Position) => {
    return valAt(state.grid, p);
  }, [state.grid]);

  if (state.clueView) {
    puzzleView = <TwoCol
      muted={muted}
      keyboardHandler={keyboardHandler}
      showExtraKeyLayout={state.showExtraKeyLayout}
      includeBlockKey={false}
      left={<ClueList active={state.active} valAt={ourValAt} showEntries={true} conceal={state.currentTimeWindowStart === 0 && !state.success} header="Across" entries={acrossEntries} current={entry.index} cross={cross ?.index} scrollToCross={false} dispatch={dispatch} />}
      right={<ClueList active={state.active} valAt={ourValAt} showEntries={true} conceal={state.currentTimeWindowStart === 0 && !state.success} header="Down" entries={downEntries} current={entry.index} cross={cross ?.index} scrollToCross={false} dispatch={dispatch} />}
    />;
  } else {
    puzzleView = <SquareAndCols
      muted={muted}
      keyboardHandler={keyboardHandler}
      showExtraKeyLayout={state.showExtraKeyLayout}
      includeBlockKey={false}
      square={
        (size: number) => {
          return <GridView
            squareSize={size}
            grid={state.grid}
            active={state.active}
            dispatch={dispatch}
            revealedCells={state.revealedCells}
            verifiedCells={state.verifiedCells}
            wrongCells={state.wrongCells}
          />;
        }
      }
      left={<ClueList active={state.active} valAt={ourValAt} showEntries={false} conceal={state.currentTimeWindowStart === 0 && !state.success} header="Across" entries={acrossEntries} current={entry.index} cross={cross ?.index} scrollToCross={true} dispatch={dispatch} />}
      right={<ClueList active={state.active} valAt={ourValAt} showEntries={false} conceal={state.currentTimeWindowStart === 0 && !state.success} header="Down" entries={downEntries} current={entry.index} cross={cross ?.index} scrollToCross={true} dispatch={dispatch} />}
      tinyColumn={<TinyNav dispatch={dispatch}><ClueList active={state.active} valAt={ourValAt} showEntries={false} conceal={state.currentTimeWindowStart === 0 && !state.success} entries={acrossEntries.concat(downEntries)} current={entry.index} cross={cross ?.index} scrollToCross={false} dispatch={dispatch} /></TinyNav>}
    />;
  }

  const dropdownMenus = useMemo(() => (
    <>
      <TopBarDropDown icon={<FaEye />} text="Reveal">
        <TopBarDropDownLink icon={<RevealSquare />} text="Reveal Square" onClick={() => {
          const ca: CheatAction = { type: 'CHEAT', unit: CheatUnit.Square, isReveal: true };
          dispatch(ca);
        }} />
        <TopBarDropDownLink icon={<RevealEntry />} text="Reveal Word" onClick={() => {
          const ca: CheatAction = { type: 'CHEAT', unit: CheatUnit.Entry, isReveal: true };
          dispatch(ca);
        }} />
        <TopBarDropDownLink icon={<RevealPuzzle />} text="Reveal Puzzle" onClick={() => {
          const ca: CheatAction = { type: 'CHEAT', unit: CheatUnit.Puzzle, isReveal: true };
          dispatch(ca);
        }} />
      </TopBarDropDown>
      {
        !state.autocheck ?
          (<TopBarDropDown icon={<FaCheck />} text="Check">
            <TopBarDropDownLink icon={<FaCheckSquare />} text="Autocheck" onClick={() => {
              const action: ToggleAutocheckAction = { type: 'TOGGLEAUTOCHECK' };
              dispatch(action);
            }} />
            <TopBarDropDownLink icon={<CheckSquare />} text="Check Square" onClick={() => {
              const ca: CheatAction = { type: 'CHEAT', unit: CheatUnit.Square };
              dispatch(ca);
            }} />
            <TopBarDropDownLink icon={<CheckEntry />} text="Check Word" onClick={() => {
              const ca: CheatAction = { type: 'CHEAT', unit: CheatUnit.Entry };
              dispatch(ca);
            }} />
            <TopBarDropDownLink icon={<CheckPuzzle />} text="Check Puzzle" onClick={() => {
              const ca: CheatAction = { type: 'CHEAT', unit: CheatUnit.Puzzle };
              dispatch(ca);
            }} />
          </TopBarDropDown>)
          :
          <TopBarLink icon={<FaCheckSquare />} text="Autochecking" onClick={() => {
            const action: ToggleAutocheckAction = { type: 'TOGGLEAUTOCHECK' };
            dispatch(action);
          }} />
      }
      <TopBarDropDown icon={<FaEllipsisH />} text="More">
        <TopBarDropDownLink icon={<Rebus />} text="Enter Rebus" shortcutHint={<EscapeKey />} onClick={() => {
          const kpa: KeypressAction = { type: 'KEYPRESS', key: 'Escape', shift: false };
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
            <>
              <TopBarDropDownLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={() => dispatch({ type: 'TOGGLEKEYBOARD' })} />
              <TopBarDropDownLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={() => dispatch({ type: 'TOGGLETABLET' })} />
              <TopBarDropDownLink icon={<FaGlasses />} text="Moderate" onClick={() => dispatch({ type: 'TOGGLEMODERATING' })} />
              <TopBarDropDownLinkA href='/admin' icon={<FaUserLock />} text="Admin" />
            </>
            : ''
        }
        {
          props.isAdmin || props.user ?.uid === puzzle.authorId ?
            <TopBarDropDownLinkA href='/crosswords/[puzzleId]/stats' as={`/crosswords/${puzzle.id}/stats`} icon={<IoMdStats />} text="Stats" />
            : ''
        }
        <TopBarDropDownLinkA href='/account' icon={<FaUser />} text="Account" />
      </TopBarDropDown>
    </>
  ), [state.autocheck, muted, props.isAdmin, props.user ?.uid, puzzle, setMuted]);

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <TopBar>
        <TopBarLink icon={<FaPause />} hoverText={'Pause Game'} text={timeString(state.displaySeconds, true)} onClick={() => dispatch({ type: 'PAUSEACTION' })} keepText={true} />
        <TopBarLink icon={state.clueView ? <SpinnerFinished /> : <FaListOl />} text={state.clueView ? 'Grid' : 'Clues'} onClick={() => {
          const a: ToggleClueViewAction = { type: 'TOGGLECLUEVIEW' };
          dispatch(a);
        }} />
        {dropdownMenus}
      </TopBar>
      {state.isEnteringRebus ?
        <RebusOverlay dispatch={dispatch} value={state.rebusValue} /> : ''}
      {state.filled && !state.success && !state.dismissedKeepTrying ?
        <KeepTryingOverlay dispatch={dispatch} />
        : ''}
      {state.success && !state.dismissedSuccess ?
        <SuccessOverlay user={props.user} nextPuzzle={props.nextPuzzle} puzzle={puzzle} isMuted={muted} solveTime={state.displaySeconds} didCheat={state.didCheat} dispatch={dispatch} />
        : ''}
      {state.moderating ?
        <ModeratingOverlay puzzle={puzzle} dispatch={dispatch} />
        : ''}
      {state.currentTimeWindowStart === 0 && !state.success && !(state.filled && !state.dismissedKeepTrying) ?
        (state.bankedSeconds === 0 ?
          <BeginPauseOverlay dismissMessage="Begin Puzzle" message="Ready to get started?" {...beginPauseProps} />
          :
          <BeginPauseOverlay dismissMessage="Resume" message="Your puzzle is paused" {...beginPauseProps} />
        )
        : ''}
      {puzzleView}
    </>
  );
};
