import {
  useReducer,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  Dispatch,
  memo,
  ReactNode,
} from 'react';
import Head from 'next/head';
import {
  FaListOl,
  FaGlasses,
  FaUser,
  FaVolumeUp,
  FaVolumeMute,
  FaPause,
  FaKeyboard,
  FaCheck,
  FaEye,
  FaEllipsisH,
  FaCheckSquare,
  FaUserLock,
  FaComment,
  FaHammer,
  FaPrint,
  FaInfoCircle,
  FaEdit,
} from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

import { Link, LinkButton, LinkButtonSimpleA } from './Link';
import { ClueList } from './ClueList';
import {
  EscapeKey,
  CheckSquare,
  RevealSquare,
  CheckEntry,
  RevealEntry,
  CheckPuzzle,
  RevealPuzzle,
  Rebus,
  SpinnerFinished,
} from './Icons';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { AuthContext, AuthPropsOptional } from './AuthContext';
import { CrosshareAudioContext } from './CrosshareAudioContext';
import { Overlay } from './Overlay';
import { GridView } from './Grid';
import { Direction, BLOCK, ServerPuzzleResult } from '../lib/types';
import { fromCells, addClues } from '../lib/viewableGrid';
import {
  entryAndCrossAtPosition,
  cellIndex,
  entryIndexAtPosition,
} from '../lib/gridBase';
import { cachePlay, writePlayToDB, isDirty } from '../lib/plays';
import {
  PlayWithoutUserT,
  getDateString,
  prettifyDateString,
} from '../lib/dbtypes';
import {
  cheat,
  checkComplete,
  puzzleReducer,
  advanceActiveToNonBlock,
  PuzzleAction,
  CheatUnit,
  CheatAction,
  KeypressAction,
  ToggleAutocheckAction,
  ToggleClueViewAction,
  LoadPlayAction,
  RanSuccessEffectsAction,
} from '../reducers/reducer';
import {
  TopBar,
  TopBarLink,
  TopBarDropDownLink,
  TopBarDropDownLinkA,
  TopBarDropDown,
  TopBarDropDownLinkSimpleA,
} from './TopBar';
import { SquareAndCols, TwoCol } from './Page';
import { usePersistedBoolean, useMatchMedia } from '../lib/hooks';
import { timeString } from '../lib/utils';
import { UpcomingMinisCalendar } from './UpcomingMinisCalendar';
import { App, TimestampClass, signInAnonymously } from '../lib/firebaseWrapper';
import { Emoji } from './Emoji';
import { Comments } from './Comments';
import { ConstructorNotes } from './ConstructorNotes';
import { ConstructorPageT } from '../lib/constructorPage';
import { SharingButtons } from './SharingButtons';
import { SMALL_AND_UP_RULES } from '../lib/style';
import { Keyboard } from './Keyboard';
import { useRouter } from 'next/router';
import { Button } from './Buttons';
import { ProfilePicAndName } from './Images';
import { Markdown } from './Markdown';
import { ToolTipText } from './ToolTipText';
import { AuthorLink } from './PuzzleLink';
import formatISO from 'date-fns/formatISO';
import { useSnackbar } from './Snackbar';
import { isNewPuzzleNotification } from '../lib/notifications';

export interface NextPuzzleLink {
  puzzleId: string;
  linkText: string;
}

interface PauseBeginProps {
  loadingPlayState: boolean;
  publishTime: number;
  title: string;
  authorName: string;
  constructorPage: ConstructorPageT | null;
  dispatch: Dispatch<PuzzleAction>;
  message: string;
  dismissMessage: string;
  notes: string | null;
  blogPost: string | null;
  profilePicture?: string | null;
  coverImage?: string | null;
}

const BeginPauseOverlay = (props: PauseBeginProps) => {
  return (
    <Overlay
      coverImage={props.coverImage}
      closeCallback={
        props.loadingPlayState
          ? undefined
          : () => props.dispatch({ type: 'RESUMEACTION' })
      }
    >
      <PuzzleHeading
        publishTime={props.publishTime}
        showTip={false}
        coverImage={props.coverImage}
        blogPost={props.blogPost}
        constructorNotes={props.notes}
        profilePic={props.profilePicture}
        title={props.title}
        authorName={props.authorName}
        constructorPage={props.constructorPage}
      />
      <div css={{ textAlign: 'center' }}>
        {props.loadingPlayState ? (
          <div>Checking for previous play data...</div>
        ) : (
          <>
            <div css={{ marginBottom: '1em' }}>{props.message}</div>
            <Button
              onClick={() => props.dispatch({ type: 'RESUMEACTION' })}
              text={props.dismissMessage}
            />
          </>
        )}
      </div>
    </Overlay>
  );
};

const ModeratingOverlay = memo(
  ({
    dispatch,
    puzzle,
  }: {
    puzzle: ServerPuzzleResult;
    dispatch: Dispatch<PuzzleAction>;
  }) => {
    const db = App.firestore();
    const [date, setDate] = useState<Date | undefined>();

    function schedule() {
      if (!date) {
        throw new Error('shouldn\'t be able to schedule w/o date');
      }
      const ds = getDateString(date);
      const update: { [k: string]: string | firebase.firestore.FieldValue } = {
        [ds]: puzzle.id,
      };
      Promise.all([
        db.collection('categories').doc('dailymini').update(update),
        db
          .collection('c')
          .doc(puzzle.id)
          .update({ m: true, c: 'dailymini', dmd: prettifyDateString(ds) }),
      ]).then(() => {
        console.log('Scheduled mini');
        sessionStorage.removeItem('categories/dailymini');
        window.location.reload();
      });
    }

    function markAsModerated(featured: boolean) {
      const update = { m: true, c: null, f: featured };
      db.collection('c')
        .doc(puzzle.id)
        .update(update)
        .then(() => {
          window.location.reload();
        });
    }

    return (
      <Overlay closeCallback={() => dispatch({ type: 'TOGGLEMODERATING' })}>
        <h4>Moderate this Puzzle</h4>
        {puzzle.isPrivate ? (
          <h4 css={{ color: 'var(--error)' }}>This puzzle is private</h4>
        ) : (
          ''
        )}
        {puzzle.isPrivateUntil ? (
          <h4 css={{ color: 'var(--error)' }}>
            This puzzle is private until{' '}
            {new Date(puzzle.isPrivateUntil).toISOString()}
          </h4>
        ) : (
          ''
        )}
        <div css={{ marginTop: '1em' }}>
          Pick a date to appear as daily mini:
        </div>
        <UpcomingMinisCalendar
          disableExisting={true}
          value={date}
          onChange={setDate}
        />
        <div css={{ marginTop: '1em' }}>Be sure to email {puzzle.authorId}</div>
        <div css={{ marginTop: '1em' }}>
          <button disabled={!date || puzzle.moderated} onClick={schedule}>
            Schedule As Daily Mini
          </button>
        </div>
        <div css={{ marginTop: '1em' }}>
          <button onClick={() => markAsModerated(true)}>Set as Featured</button>
        </div>
        <div css={{ marginTop: '1em' }}>
          <button onClick={() => markAsModerated(false)}>
            Mark as Moderated
          </button>
        </div>
      </Overlay>
    );
  }
);

const KeepTryingOverlay = ({
  dispatch,
}: {
  dispatch: Dispatch<PuzzleAction>;
}) => {
  return (
    <Overlay closeCallback={() => dispatch({ type: 'DISMISSKEEPTRYING' })}>
      <h4>
        <Emoji symbol="🤔" /> Almost there!
      </h4>
      <p>
        You&apos;ve completed the puzzle, but there are one or more mistakes.
      </p>
      <Button
        css={{ width: '100%' }}
        onClick={() => dispatch({ type: 'DISMISSKEEPTRYING' })}
        text="Keep Trying"
      />
    </Overlay>
  );
};

const PrevDailyMiniLink = ({ nextPuzzle }: { nextPuzzle?: NextPuzzleLink }) => {
  if (!nextPuzzle) {
    return <></>;
  }
  return (
    <Link
      href="/crosswords/[puzzleId]"
      as={`/crosswords/${nextPuzzle.puzzleId}`}
      passHref
    >
      Play {nextPuzzle.linkText}
    </Link>
  );
};

const PuzzleHeading = (props: {
  publishTime: number;
  showTip: boolean;
  constructorNotes: string | null;
  coverImage: string | null | undefined;
  profilePic: string | null | undefined;
  title: string;
  authorName: string;
  constructorPage: ConstructorPageT | null;
  blogPost: string | null;
}) => {
  const publishDate = new Date(props.publishTime);
  return (
    <>
      <ProfilePicAndName
        {...props}
        bonusMargin={1}
        topLine={props.title}
        byLine={
          <p>
            <AuthorLink
              authorName={props.authorName}
              constructorPage={props.constructorPage}
            />{' '}
            ·{' '}
            <span title={formatISO(publishDate)}>
              Published {formatDistanceToNow(publishDate)} ago
            </span>
          </p>
        }
      />
      {props.constructorNotes ? (
        <div css={{ textAlign: 'center' }}>
          <ConstructorNotes notes={props.constructorNotes} />
        </div>
      ) : (
        ''
      )}
      {props.blogPost ? (
        <div css={{ margin: '1em 0' }}>
          <Markdown css={{ textAlign: 'left' }} text={props.blogPost} />
        </div>
      ) : (
        ''
      )}
      {props.constructorPage?.sig ? (
        <div css={{ margin: '1em 0' }}>
          <Markdown
            inline={true}
            css={{ textAlign: 'left' }}
            text={props.constructorPage.sig}
          />
        </div>
      ) : (
        ''
      )}

      {props.showTip &&
      props.constructorPage?.pp &&
      props.constructorPage.pt ? (
          <div css={{ textAlign: 'center' }}>
            <LinkButtonSimpleA
              css={{ marginRight: '0.5em' }}
              href={`https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(
                props.constructorPage.pp
              )}&item_name=${encodeURIComponent(
                props.constructorPage.pt
              )}&currency_code=USD&source=url`}
              text={`Tip ${props.constructorPage.n}`}
            />
            <ToolTipText
              text={<FaInfoCircle />}
              tooltip="All donations go directly to the constructor via PayPal"
            />
          </div>
        ) : (
          ''
        )}
    </>
  );
};

const SuccessOverlay = (props: {
  publishTime: number;
  coverImage?: string | null;
  profilePicture?: string | null;
  clueMap: Map<string, [number, Direction, string]>;
  user?: firebase.User;
  puzzle: ServerPuzzleResult;
  nextPuzzle?: NextPuzzleLink;
  isMuted: boolean;
  solveTime: number;
  didCheat: boolean;
  dispatch: Dispatch<PuzzleAction>;
}) => {
  return (
    <Overlay
      coverImage={props.coverImage}
      closeCallback={() => props.dispatch({ type: 'DISMISSSUCCESS' })}
    >
      <PuzzleHeading
        publishTime={props.publishTime}
        showTip={true}
        coverImage={props.coverImage}
        blogPost={props.puzzle.blogPost}
        constructorNotes={props.puzzle.constructorNotes}
        profilePic={props.profilePicture}
        title={props.puzzle.title}
        authorName={props.puzzle.authorName}
        constructorPage={props.puzzle.constructorPage}
      />
      <div css={{ textAlign: 'center' }}>
        {props.user?.uid === props.puzzle.authorId ? (
          <>
            <p>
              Your puzzle is live! Copy the link to share with solvers (solvers
              will see an empty grid, yours is complete since you authored the
              puzzle). Comments posted below will be visible to anyone who
              finishes solving the puzzle.
            </p>
            <SharingButtons
              text={`Check out the crossword puzzle I made: "${props.puzzle.title}"`}
              path={`/crosswords/${props.puzzle.id}`}
            />
          </>
        ) : (
          <>
            <h4 css={{ marginTop: '1.5em' }}>
              <Emoji symbol="🎉" /> Congratulations! <Emoji symbol="🎊" />
            </h4>
            <p css={{ marginBottom: 0 }}>
              You solved the puzzle in{' '}
              <b>{timeString(props.solveTime, false)}</b> - challenge your
              friends:
            </p>
            <SharingButtons
              text={`I solved "${props.puzzle.title}" in ${timeString(
                props.solveTime,
                false
              )} - how fast can you solve it?`}
              path={`/crosswords/${props.puzzle.id}`}
            />
          </>
        )}
        {!props.user || props.user.isAnonymous ? (
          <>
            <p>Sign in with google to track your puzzle solving streak!</p>
            {props.user ? (
              <GoogleLinkButton user={props.user} />
            ) : (
              <GoogleSignInButton />
            )}
          </>
        ) : (
          ''
        )}
        <div>
          <PrevDailyMiniLink nextPuzzle={props.nextPuzzle} />
        </div>
      </div>
      <Comments
        clueMap={props.clueMap}
        solveTime={props.solveTime}
        didCheat={props.didCheat}
        puzzleId={props.puzzle.id}
        puzzleAuthorId={props.puzzle.authorId}
        comments={props.puzzle.comments}
      />
      {props.user?.uid !== props.puzzle.authorId ? (
        <div css={{ marginTop: '2em', textAlign: 'center' }}>
          <LinkButton href="/construct" as="/construct" passHref>
            Make your own puzzle with the Crosshare constructor
          </LinkButton>
        </div>
      ) : (
        ''
      )}
    </Overlay>
  );
};

export const RebusOverlay = (props: {
  value: string;
  dispatch: Dispatch<KeypressAction>;
}) => {
  return (
    <Overlay
      showKeyboard
      closeCallback={() => {
        const escape: KeypressAction = {
          type: 'KEYPRESS',
          key: 'Escape',
          shift: false,
        };
        props.dispatch(escape);
      }}
    >
      <div
        css={{
          color: props.value ? 'var(--black)' : 'var(--default-text)',
          margin: '0.5em 0',
          textAlign: 'center',
          fontSize: '2.5em',
          lineHeight: '1em',
        }}
      >
        {props.value ? props.value : 'Type to enter rebus...'}
      </div>
      <Button
        boring={true}
        onClick={() => {
          const escape: KeypressAction = {
            type: 'KEYPRESS',
            key: 'Escape',
            shift: false,
          };
          props.dispatch(escape);
        }}
        css={{ marginRight: '10%', width: '45%' }}
        text="Cancel"
      />
      <Button
        disabled={props.value.length === 0}
        onClick={() => {
          const enter: KeypressAction = {
            type: 'KEYPRESS',
            key: 'Enter',
            shift: false,
          };
          props.dispatch(enter);
        }}
        css={{ width: '45%' }}
        text="Submit Rebus"
      />
    </Overlay>
  );
};

interface PuzzleProps {
  puzzle: ServerPuzzleResult;
  play: PlayWithoutUserT | null;
  loadingPlayState: boolean;
  nextPuzzle?: NextPuzzleLink;
  profilePicture?: string | null;
  coverImage?: string | null;
}
export const Puzzle = ({
  loadingPlayState,
  puzzle,
  play,
  ...props
}: PuzzleProps & AuthPropsOptional) => {
  const [state, dispatch] = useReducer(
    puzzleReducer,
    {
      type: 'puzzle',
      wasEntryClick: false,
      active: { col: 0, row: 0, dir: Direction.Across },
      grid: addClues(
        fromCells({
          mapper: (e) => e,
          width: puzzle.size.cols,
          height: puzzle.size.rows,
          cells: play
            ? play.g
            : puzzle.grid.map((s) => (s === BLOCK ? BLOCK : ' ')),
          allowBlockEditing: false,
          highlighted: new Set(puzzle.highlighted),
          highlight: puzzle.highlight,
        }),
        puzzle.clues
      ),
      showExtraKeyLayout: false,
      answers: puzzle.grid,
      verifiedCells: new Set<number>(play ? play.vc : []),
      wrongCells: new Set<number>(play ? play.wc : []),
      revealedCells: new Set<number>(play ? play.rc : []),
      isEnteringRebus: false,
      rebusValue: '',
      success: play ? play.f : false,
      ranSuccessEffects: play ? play.f : false,
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
      loadedPlayState: !loadingPlayState,
      waitToResize: true,
      isEditable(cellIndex) {
        return !this.verifiedCells.has(cellIndex) && !this.success;
      },
      postEdit(cellIndex) {
        let state = this; // eslint-disable-line @typescript-eslint/no-this-alias
        state.wrongCells.delete(cellIndex);
        if (state.autocheck) {
          state = cheat(state, CheatUnit.Square, false);
        }
        return checkComplete(state);
      },
    },
    advanceActiveToNonBlock
  );

  const authContext = useContext(AuthContext);
  useEffect(() => {
    if (!authContext.notifications?.length) {
      return;
    }
    for (const notification of authContext.notifications) {
      if (notification.r) {
        // shouldn't be possible but be defensive
        continue;
      }
      if (!isNewPuzzleNotification(notification)) {
        continue;
      }
      if (notification.p === puzzle.id) {
        App.firestore()
          .collection('n')
          .doc(notification.id)
          .update({ r: true });
        return;
      }
    }
  }, [authContext.notifications, puzzle.id]);

  useEffect(() => {
    if (loadingPlayState === false) {
      const action: LoadPlayAction = {
        type: 'LOADPLAY',
        play: play,
        isAuthor: props.user ? props.user.uid === puzzle.authorId : false,
      };
      dispatch(action);
    }
  }, [loadingPlayState, play, props.user, puzzle.authorId]);

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
      writePlayToDBIfNeeded();
    }
  }
  useEventListener('blur', prodPause);

  const [muted, setMuted] = usePersistedBoolean('muted', false);
  const [toggleKeyboard, setToggleKeyboard] = usePersistedBoolean(
    'keyboard',
    false
  );

  // Set up music player for success song
  const [audioContext, initAudioContext] = useContext(CrosshareAudioContext);
  const playSuccess = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!audioContext) {
      return initAudioContext();
    }
    if (!playSuccess.current && !muted && audioContext) {
      fetch('/success.mp3')
        .then((response) => response.arrayBuffer())
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

  const writePlayToDBIfNeeded = useCallback(
    async (user?: firebase.User) => {
      console.log('doing write play');
      if (!state.loadedPlayState) {
        return;
      }
      if (state.ranSuccessEffects) {
        return;
      }
      const u = user || props.user;
      if (!u) {
        return;
      }
      if (!isDirty(u, puzzle.id)) {
        return;
      }
      writePlayToDB(u, puzzle.id)
        .then(() => {
          console.log('Finished writing play state to db');
        })
        .catch((reason) => {
          console.error('Failed to write play: ', reason);
        });
    },
    [puzzle.id, props.user, state.ranSuccessEffects, state.loadedPlayState]
  );

  const cachePlayForUser = useCallback(
    (user: firebase.User | undefined) => {
      if (!state.loadedPlayState) {
        return;
      }
      const updatedAt = TimestampClass.now();
      const playTime =
        state.currentTimeWindowStart === 0
          ? state.bankedSeconds
          : state.bankedSeconds +
            (new Date().getTime() - state.currentTimeWindowStart) / 1000;

      const play: PlayWithoutUserT = {
        c: puzzle.id,
        n: puzzle.title,
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
      cachePlay(user, puzzle.id, play);
    },
    [
      state.loadedPlayState,
      puzzle.id,
      state.cellsEverMarkedWrong,
      state.cellsIterationCount,
      state.cellsUpdatedAt,
      state.didCheat,
      state.grid.cells,
      state.revealedCells,
      state.success,
      state.verifiedCells,
      state.wrongCells,
      puzzle.title,
      state.bankedSeconds,
      state.currentTimeWindowStart,
    ]
  );

  useEffect(() => {
    cachePlayForUser(props.user);
  }, [props.user, cachePlayForUser]);

  const router = useRouter();
  useEffect(() => {
    const listener = () => {
      writePlayToDBIfNeeded();
    };
    window.addEventListener('beforeunload', listener);
    router.events.on('routeChangeStart', listener);

    return () => {
      window.removeEventListener('beforeunload', listener);
      router.events.off('routeChangeStart', listener);
    };
  }, [writePlayToDBIfNeeded, router]);

  const { addToast } = useSnackbar();

  useEffect(() => {
    if (state.success && !state.ranSuccessEffects) {
      const action: RanSuccessEffectsAction = { type: 'RANSUCCESS' };
      dispatch(action);

      if (props.user) {
        cachePlayForUser(props.user);
        writePlayToDBIfNeeded(props.user);
      } else {
        signInAnonymously().then((u) => {
          cachePlayForUser(u);
          writePlayToDBIfNeeded(u);
        });
      }

      let delay = 0;
      if (state.bankedSeconds <= 60) {
        addToast('🥇 Solved in under a minute!');
        delay += 500;
      }
      if (!state.didCheat) {
        addToast('🤓 Solved without check/reveal!', delay);
      }
      if (!muted && playSuccess.current) {
        playSuccess.current();
      }
    }
  }, [
    addToast,
    cachePlayForUser,
    muted,
    props.user,
    state.bankedSeconds,
    state.didCheat,
    state.ranSuccessEffects,
    state.success,
    writePlayToDBIfNeeded,
  ]);

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      // disable keyboard when paused / loading play
      if (loadingPlayState || !state.currentTimeWindowStart) {
        return;
      }
      const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tagName === 'textarea' || tagName === 'input') {
        return;
      }
      if (e.metaKey || e.altKey || e.ctrlKey) {
        return; // This way you can still do apple-R and such
      }
      const kpa: KeypressAction = {
        type: 'KEYPRESS',
        key: e.key,
        shift: e.shiftKey,
      };
      dispatch(kpa);
      e.preventDefault();
    },
    [dispatch, loadingPlayState, state.currentTimeWindowStart]
  );
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

  const keyboardHandler = useCallback(
    (key: string) => {
      const kpa: KeypressAction = { type: 'KEYPRESS', key: key, shift: false };
      dispatch(kpa);
    },
    [dispatch]
  );

  const { acrossEntries, downEntries } = useMemo(() => {
    return {
      acrossEntries: state.grid.entries.filter(
        (e) => e.direction === Direction.Across
      ),
      downEntries: state.grid.entries.filter(
        (e) => e.direction === Direction.Down
      ),
    };
  }, [state.grid.entries]);

  const beginPauseProps = {
    coverImage: props.coverImage,
    publishTime: puzzle.publishTime,
    blogPost: puzzle.blogPost,
    constructorPage: puzzle.constructorPage,
    profilePicture: props.profilePicture,
    loadingPlayState: loadingPlayState || !state.loadedPlayState,
    notes: puzzle.constructorNotes,
    authorName: puzzle.authorName,
    title: puzzle.title,
    dispatch: dispatch,
  };

  /* `clueMap` is a map from ENTRYWORD => '5D: This is the clue' - we use this
   *    for comment clue tooltips.
   * `refs` is a set of referenced '5D's for each entry in the grid - we use this
   *    for grid highlights when an entry is selected.
   */
  const [clueMap, refs] = useMemo(() => {
    const asList: Array<[
      string,
      [number, Direction, string]
    ]> = state.grid.entries.map((e) => {
      return [
        e.cells.map((p) => state.answers[cellIndex(state.grid, p)]).join(''),
        [e.labelNumber, e.direction, e.clue],
      ];
    });

    const refsList: Array<Set<[number, 0 | 1]>> = [];

    for (const e of state.grid.entries) {
      const refs = new Set<[number, 0 | 1]>();
      let match;
      const re = /(?<numSection>(,? ?(and)? ?\b\d+[- ]?)+)(?<dir>across|down)\b/gi;
      while ((match = re.exec(e.clue)) !== null) {
        const dirString = match.groups?.dir?.toLowerCase();
        if (!dirString) {
          throw new Error('missing dir string');
        }
        const dir = dirString === 'across' ? Direction.Across : Direction.Down;
        const numSection = match.groups?.numSection;
        if (!numSection) {
          throw new Error('missing numSection');
        }
        let numMatch;
        const numRe = /\d+/g;
        while ((numMatch = numRe.exec(numSection)) !== null) {
          refs.add([parseInt(numMatch[0]), dir]);
        }
      }
      refsList.push(refs);
    }

    // Now do backrefs
    refsList.forEach((refs, idx) => {
      const e1 = state.grid.entries[idx];
      refsList.forEach((refs2, idx2) => {
        if (idx2 === idx) {
          return;
        }
        const e2 = state.grid.entries[idx2];
        refs2.forEach(([labelNumber, dir]) => {
          if (labelNumber === e1.labelNumber && dir === e1.direction) {
            refs.add([e2.labelNumber, e2.direction]);
          }
        });
      });
    });

    return [new Map(asList), refsList];
  }, [state.answers, state.grid]);

  const scrollToCross = useMatchMedia(SMALL_AND_UP_RULES);

  let puzzleView: ReactNode;

  const entryIdx = entryIndexAtPosition(state.grid, state.active);
  let refed: Array<number> = [];
  if (entryIdx !== null) {
    refed = [...refs[entryIdx]].map(([labelNumber, direction]) =>
      state.grid.entries.findIndex(
        (e) => e.labelNumber === labelNumber && e.direction === direction
      )
    );
  }

  const shouldConceal =
    state.currentTimeWindowStart === 0 &&
    !(state.success && state.dismissedSuccess);
  if (state.clueView) {
    puzzleView = (
      <TwoCol
        left={
          <ClueList
            wasEntryClick={state.wasEntryClick}
            allEntries={state.grid.entries}
            refed={refed}
            dimCompleted={true}
            active={state.active}
            grid={state.grid}
            showEntries={true}
            conceal={shouldConceal}
            header="Across"
            entries={acrossEntries}
            current={entry.index}
            cross={cross?.index}
            scrollToCross={scrollToCross}
            dispatch={dispatch}
          />
        }
        right={
          <ClueList
            wasEntryClick={state.wasEntryClick}
            allEntries={state.grid.entries}
            refed={refed}
            dimCompleted={true}
            active={state.active}
            grid={state.grid}
            showEntries={true}
            conceal={shouldConceal}
            header="Down"
            entries={downEntries}
            current={entry.index}
            cross={cross?.index}
            scrollToCross={scrollToCross}
            dispatch={dispatch}
          />
        }
      />
    );
  } else {
    puzzleView = (
      <SquareAndCols
        waitToResize={state.waitToResize}
        dispatch={dispatch}
        aspectRatio={state.grid.width / state.grid.height}
        square={(width: number, _height: number) => {
          return (
            <GridView
              squareWidth={width}
              grid={state.grid}
              active={state.active}
              entryRefs={refs}
              dispatch={dispatch}
              revealedCells={state.revealedCells}
              verifiedCells={state.verifiedCells}
              wrongCells={state.wrongCells}
            />
          );
        }}
        left={
          <ClueList
            wasEntryClick={state.wasEntryClick}
            scrollToCross={scrollToCross}
            allEntries={state.grid.entries}
            refed={refed}
            dimCompleted={true}
            active={state.active}
            grid={state.grid}
            showEntries={false}
            conceal={shouldConceal}
            header="Across"
            entries={acrossEntries}
            current={entry.index}
            cross={cross?.index}
            dispatch={dispatch}
          />
        }
        right={
          <ClueList
            wasEntryClick={state.wasEntryClick}
            scrollToCross={scrollToCross}
            allEntries={state.grid.entries}
            refed={refed}
            dimCompleted={true}
            active={state.active}
            grid={state.grid}
            showEntries={false}
            conceal={shouldConceal}
            header="Down"
            entries={downEntries}
            current={entry.index}
            cross={cross?.index}
            dispatch={dispatch}
          />
        }
      />
    );
  }

  const checkRevealMenus = useMemo(
    () => (
      <>
        <TopBarDropDown icon={<FaEye />} text="Reveal">
          {() => (
            <>
              <TopBarDropDownLink
                icon={<RevealSquare />}
                text="Reveal Square"
                onClick={() => {
                  const ca: CheatAction = {
                    type: 'CHEAT',
                    unit: CheatUnit.Square,
                    isReveal: true,
                  };
                  dispatch(ca);
                }}
              />
              <TopBarDropDownLink
                icon={<RevealEntry />}
                text="Reveal Word"
                onClick={() => {
                  const ca: CheatAction = {
                    type: 'CHEAT',
                    unit: CheatUnit.Entry,
                    isReveal: true,
                  };
                  dispatch(ca);
                }}
              />
              <TopBarDropDownLink
                icon={<RevealPuzzle />}
                text="Reveal Puzzle"
                onClick={() => {
                  const ca: CheatAction = {
                    type: 'CHEAT',
                    unit: CheatUnit.Puzzle,
                    isReveal: true,
                  };
                  dispatch(ca);
                }}
              />
            </>
          )}
        </TopBarDropDown>
        {!state.autocheck ? (
          <TopBarDropDown icon={<FaCheck />} text="Check">
            {() => (
              <>
                <TopBarDropDownLink
                  icon={<FaCheckSquare />}
                  text="Autocheck"
                  onClick={() => {
                    const action: ToggleAutocheckAction = {
                      type: 'TOGGLEAUTOCHECK',
                    };
                    dispatch(action);
                  }}
                />
                <TopBarDropDownLink
                  icon={<CheckSquare />}
                  text="Check Square"
                  onClick={() => {
                    const ca: CheatAction = {
                      type: 'CHEAT',
                      unit: CheatUnit.Square,
                    };
                    dispatch(ca);
                  }}
                />
                <TopBarDropDownLink
                  icon={<CheckEntry />}
                  text="Check Word"
                  onClick={() => {
                    const ca: CheatAction = {
                      type: 'CHEAT',
                      unit: CheatUnit.Entry,
                    };
                    dispatch(ca);
                  }}
                />
                <TopBarDropDownLink
                  icon={<CheckPuzzle />}
                  text="Check Puzzle"
                  onClick={() => {
                    const ca: CheatAction = {
                      type: 'CHEAT',
                      unit: CheatUnit.Puzzle,
                    };
                    dispatch(ca);
                  }}
                />
              </>
            )}
          </TopBarDropDown>
        ) : (
          <TopBarLink
            icon={<FaCheckSquare />}
            text="Autochecking"
            onClick={() => {
              const action: ToggleAutocheckAction = { type: 'TOGGLEAUTOCHECK' };
              dispatch(action);
            }}
          />
        )}
      </>
    ),
    [state.autocheck]
  );

  const moreMenu = useMemo(
    () => (
      <>
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          {() => (
            <>
              {!state.success ? (
                <TopBarDropDownLink
                  icon={<Rebus />}
                  text="Enter Rebus"
                  shortcutHint={<EscapeKey />}
                  onClick={() => {
                    const kpa: KeypressAction = {
                      type: 'KEYPRESS',
                      key: 'Escape',
                      shift: false,
                    };
                    dispatch(kpa);
                  }}
                />
              ) : (
                ''
              )}
              {muted ? (
                <TopBarDropDownLink
                  icon={<FaVolumeUp />}
                  text="Unmute"
                  onClick={() => setMuted(false)}
                />
              ) : (
                <TopBarDropDownLink
                  icon={<FaVolumeMute />}
                  text="Mute"
                  onClick={() => setMuted(true)}
                />
              )}
              <TopBarDropDownLink
                icon={<FaKeyboard />}
                text="Toggle Keyboard"
                onClick={() => setToggleKeyboard(!toggleKeyboard)}
              />
              {props.isAdmin ? (
                <>
                  <TopBarDropDownLink
                    icon={<FaGlasses />}
                    text="Moderate"
                    onClick={() => dispatch({ type: 'TOGGLEMODERATING' })}
                  />
                  <TopBarDropDownLinkA
                    href="/admin"
                    icon={<FaUserLock />}
                    text="Admin"
                  />
                </>
              ) : (
                ''
              )}
              {props.isAdmin || props.user?.uid === puzzle.authorId ? (
                <>
                  <TopBarDropDownLinkA
                    href="/crosswords/[puzzleId]/stats"
                    as={`/crosswords/${puzzle.id}/stats`}
                    icon={<IoMdStats />}
                    text="Stats"
                  />
                  <TopBarDropDownLinkA
                    href="/crosswords/[puzzleId]/edit"
                    as={`/crosswords/${puzzle.id}/edit`}
                    icon={<FaEdit />}
                    text="Edit"
                  />
                </>
              ) : (
                ''
              )}
              <TopBarDropDownLinkSimpleA
                href={'/api/pdf/' + puzzle.id}
                icon={<FaPrint />}
                text="Print Puzzle"
              />
              <TopBarDropDownLinkA
                href="/account"
                icon={<FaUser />}
                text="Account"
              />
              <TopBarDropDownLinkA
                href="/construct"
                icon={<FaHammer />}
                text="Construct a Puzzle"
              />
            </>
          )}
        </TopBarDropDown>
      </>
    ),
    [
      muted,
      props.isAdmin,
      props.user?.uid,
      puzzle,
      setMuted,
      state.success,
      toggleKeyboard,
      setToggleKeyboard,
    ]
  );

  const description = puzzle.blogPost
    ? puzzle.blogPost.slice(0, 160) + '...'
    : puzzle.clues
      .map((c) => c.clue)
      .sort()
      .slice(0, 10)
      .join('; ');

  return (
    <>
      <Head>
        <title>{puzzle.title} | Crosshare crossword puzzle</title>
        <meta key="og:title" property="og:title" content={puzzle.title} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
        <meta
          key="og:image"
          property="og:image"
          content={'https://crosshare.org/api/ogimage/' + puzzle.id}
        />
        <meta key="og:image:width" property="og:image:width" content="1200" />
        <meta key="og:image:height" property="og:image:height" content="630" />
        <meta
          key="og:image:alt"
          property="og:image:alt"
          content="An image of the puzzle grid"
        />
        <meta key="description" name="description" content={description} />
      </Head>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div css={{ flex: 'none' }}>
          <TopBar>
            {!loadingPlayState ? (
              !state.success ? (
                <>
                  <TopBarLink
                    icon={<FaPause />}
                    hoverText={'Pause Game'}
                    text={timeString(state.displaySeconds, true)}
                    onClick={() => {
                      dispatch({ type: 'PAUSEACTION' });
                      writePlayToDBIfNeeded();
                    }}
                    keepText={true}
                  />
                  <TopBarLink
                    icon={state.clueView ? <SpinnerFinished /> : <FaListOl />}
                    text={state.clueView ? 'Grid' : 'Clues'}
                    onClick={() => {
                      const a: ToggleClueViewAction = {
                        type: 'TOGGLECLUEVIEW',
                      };
                      dispatch(a);
                    }}
                  />
                  {checkRevealMenus}
                  {moreMenu}
                </>
              ) : (
                <>
                  <TopBarLink
                    icon={<FaComment />}
                    text={'Show Comments'}
                    onClick={() => dispatch({ type: 'UNDISMISSSUCCESS' })}
                  />
                  {moreMenu}
                </>
              )
            ) : (
              moreMenu
            )}
          </TopBar>
        </div>
        {state.isEnteringRebus ? (
          <RebusOverlay dispatch={dispatch} value={state.rebusValue} />
        ) : (
          ''
        )}
        {state.filled && !state.success && !state.dismissedKeepTrying ? (
          <KeepTryingOverlay dispatch={dispatch} />
        ) : (
          ''
        )}
        {state.success && !state.dismissedSuccess ? (
          <SuccessOverlay
            publishTime={puzzle.publishTime}
            coverImage={props.coverImage}
            profilePicture={props.profilePicture}
            clueMap={clueMap}
            user={props.user}
            nextPuzzle={props.nextPuzzle}
            puzzle={puzzle}
            isMuted={muted}
            solveTime={state.displaySeconds}
            didCheat={state.didCheat}
            dispatch={dispatch}
          />
        ) : (
          ''
        )}
        {state.moderating ? (
          <ModeratingOverlay puzzle={puzzle} dispatch={dispatch} />
        ) : (
          ''
        )}
        {state.currentTimeWindowStart === 0 &&
        !state.success &&
        !(state.filled && !state.dismissedKeepTrying) ? (
            state.bankedSeconds === 0 ? (
              <BeginPauseOverlay
                dismissMessage="Begin Puzzle"
                message="Ready to get started?"
                {...beginPauseProps}
              />
            ) : (
              <BeginPauseOverlay
                dismissMessage="Resume"
                message="Your puzzle is paused"
                {...beginPauseProps}
              />
            )
          ) : (
            ''
          )}
        <div
          css={{ flex: '1 1 auto', overflow: 'scroll', position: 'relative' }}
        >
          {puzzleView}
        </div>
        <div css={{ flex: 'none', width: '100%' }}>
          <Keyboard
            toggleKeyboard={toggleKeyboard}
            keyboardHandler={keyboardHandler}
            muted={muted}
            showExtraKeyLayout={state.showExtraKeyLayout}
            includeBlockKey={false}
          />
        </div>
      </div>
    </>
  );
};
