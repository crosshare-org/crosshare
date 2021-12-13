import {
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  Dispatch,
  ReactNode,
} from 'react';
import Head from 'next/head';
import { ImEmbed } from 'react-icons/im';
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
  FaEdit,
  FaRegFile,
} from 'react-icons/fa';
import { ClueText } from './ClueText';
import { IoMdStats } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';

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
import { AuthContext, AuthPropsOptional } from './AuthContext';
import { CrosshareAudioContext } from './CrosshareAudioContext';
import { Overlay } from './Overlay';
import { GridView } from './Grid';
import {
  Direction,
  BLOCK,
  getClueText,
  KeyK,
  fromKeyboardEvent,
  fromKeyString,
} from '../lib/types';
import {
  fromCells,
  addClues,
  getEntryToClueMap,
  getRefs,
} from '../lib/viewableGrid';
import { entryAndCrossAtPosition, entryIndexAtPosition } from '../lib/gridBase';
import { cachePlay, writePlayToDB, isDirty } from '../lib/plays';
import { PlayWithoutUserT } from '../lib/dbtypes';
import {
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
  RanMetaSubmitEffectsAction,
  PasteAction,
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
import { isMetaSolution, timeString } from '../lib/utils';
import { App, TimestampClass, signInAnonymously } from '../lib/firebaseWrapper';
import type firebase from 'firebase/app';
import { Emoji } from './Emoji';
import { SMALL_AND_UP_RULES, SQUARE_HEADER_HEIGHT } from '../lib/style';
import { Keyboard } from './Keyboard';
import { useRouter } from 'next/router';
import { Button } from './Buttons';
import { useSnackbar } from './Snackbar';
import { isNewPuzzleNotification } from '../lib/notifications';
import { PuzzlePageResultProps } from '../lib/serverOnly';
import { EmbedContext } from './EmbedContext';
import dynamic from 'next/dynamic';
import type { ModeratingOverlay as ModeratingOverlayType } from './ModerateOverlay';
import type { EmbedOverlay as EmbedOverlayType } from './EmbedOverlay';
import {
  OverlayType,
  PuzzleOverlay,
  PuzzleOverlayBaseProps,
} from './PuzzleOverlay';
import { I18nTags } from './I18nTags';
import { t, Trans } from '@lingui/macro';
import { isSome } from 'fp-ts/lib/Option';

const ModeratingOverlay = dynamic(
  () => import('./ModerateOverlay').then((mod) => mod.ModeratingOverlay as any), // eslint-disable-line @typescript-eslint/no-explicit-any
  { ssr: false }
) as typeof ModeratingOverlayType;

const EmbedOverlay = dynamic(
  () => import('./EmbedOverlay').then((mod) => mod.EmbedOverlay as any), // eslint-disable-line @typescript-eslint/no-explicit-any
  { ssr: false }
) as typeof EmbedOverlayType;

export interface NextPuzzleLink {
  puzzleId: string;
  linkText: string;
}

const KeepTryingOverlay = ({
  dispatch,
}: {
  dispatch: Dispatch<PuzzleAction>;
}) => {
  return (
    <Overlay closeCallback={() => dispatch({ type: 'DISMISSKEEPTRYING' })}>
      <h4>
        <Emoji symbol="🤔" /> <Trans>Almost there!</Trans>
      </h4>
      <p>
        <Trans>
          You&apos;ve completed the puzzle, but there are one or more mistakes.
        </Trans>
      </p>
      <Button
        css={{ width: '100%' }}
        onClick={() => dispatch({ type: 'DISMISSKEEPTRYING' })}
        text={t`Keep Trying`}
      />
    </Overlay>
  );
};

interface PuzzleProps extends PuzzlePageResultProps {
  play: PlayWithoutUserT | null;
  loadingPlayState: boolean;
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
      alternateSolutions: puzzle.alternateSolutions,
      verifiedCells: new Set<number>(play ? play.vc : []),
      wrongCells: new Set<number>(play ? play.wc : []),
      revealedCells: new Set<number>(play ? play.rc : []),
      downsOnly: play?.do || false,
      isEnteringRebus: false,
      rebusValue: '',
      success: play ? play.f : false,
      ranSuccessEffects: play ? play.f : false,
      filled: false,
      autocheck: false,
      dismissedKeepTrying: false,
      dismissedSuccess: false,
      moderating: false,
      showingEmbedOverlay: false,
      displaySeconds: play ? play.t : 0,
      bankedSeconds: play ? play.t : 0,
      ranMetaSubmitEffects: false,
      ...(play &&
        play.ct_rv && {
          contestRevealed: true,
          contestSubmitTime: play.ct_t?.toMillis(),
        }),
      ...(play &&
        play.ct_sub && {
          ranMetaSubmitEffects: true,
          contestPriorSubmissions: play.ct_pr_subs,
          contestDisplayName: play.ct_n,
          contestSubmission: play.ct_sub,
          contestEmail: play.ct_em,
          contestSubmitTime: play.ct_t?.toMillis(),
        }),
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
        prefs: props.prefs,
        isAuthor: props.user ? props.user.uid === puzzle.authorId : false,
      };
      dispatch(action);
    }
  }, [loadingPlayState, play, props.user, props.prefs, puzzle.authorId]);

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
      if (puzzle.contestAnswers?.length) {
        // For a meta we need to have run both to skip
        if (state.ranSuccessEffects && state.ranMetaSubmitEffects) {
          return;
        }
      } else {
        // For a reg puzzle skip if success effects have run
        if (state.ranSuccessEffects) {
          return;
        }
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
    [
      puzzle.id,
      puzzle.contestAnswers,
      props.user,
      state.ranMetaSubmitEffects,
      state.ranSuccessEffects,
      state.loadedPlayState,
    ]
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

      const playForUser: PlayWithoutUserT = {
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
        do: state.downsOnly,
        f: state.success,
        ...(state.contestRevealed && {
          ct_rv: state.contestRevealed,
          ct_t:
            state.contestSubmitTime !== undefined
              ? TimestampClass.fromMillis(state.contestSubmitTime)
              : undefined,
          ct_n: state.contestDisplayName,
        }),
        ...(state.contestSubmission && {
          ct_sub: state.contestSubmission,
          ct_pr_subs: state.contestPriorSubmissions || [],
          ct_t:
            state.contestSubmitTime !== undefined
              ? TimestampClass.fromMillis(state.contestSubmitTime)
              : undefined,
          ct_n: state.contestDisplayName,
          ...(state.contestEmail && {
            ct_em: state.contestEmail,
          }),
        }),
      };
      cachePlay(user, puzzle.id, playForUser);
    },
    [
      state.downsOnly,
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
      state.contestSubmission,
      state.contestSubmitTime,
      state.contestEmail,
      state.contestDisplayName,
      state.contestRevealed,
      state.contestPriorSubmissions,
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
    if (
      (state.contestSubmission || state.contestRevealed) &&
      !state.ranMetaSubmitEffects
    ) {
      const action: RanMetaSubmitEffectsAction = { type: 'RANMETASUBMIT' };
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
    }
  }, [
    cachePlayForUser,
    state.contestSubmission,
    state.contestRevealed,
    state.ranMetaSubmitEffects,
    props.user,
    writePlayToDBIfNeeded,
  ]);

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
      if (!state.didCheat && state.downsOnly) {
        addToast('👇 Solved downs-only!', delay);
      } else if (!state.didCheat) {
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
    state.downsOnly,
    state.ranSuccessEffects,
    state.success,
    writePlayToDBIfNeeded,
  ]);

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      // Disable keyboard when paused / loading play
      if (!(state.success && state.dismissedSuccess)) {
        if (loadingPlayState || !state.currentTimeWindowStart) {
          return;
        }
      }

      const mkey = fromKeyboardEvent(e);
      if (isSome(mkey)) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
        dispatch(kpa);
        e.preventDefault();
      }
    },
    [
      dispatch,
      loadingPlayState,
      state.currentTimeWindowStart,
      state.success,
      state.dismissedSuccess,
    ]
  );
  useEventListener('keydown', physicalKeyboardHandler);

  const pasteHandler = useCallback(
    (e: ClipboardEvent) => {
      const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tagName === 'textarea' || tagName === 'input') {
        return;
      }

      const pa: PasteAction = {
        type: 'PASTE',
        content: e.clipboardData?.getData('Text') || '',
      };
      dispatch(pa);
      e.preventDefault();
    },
    [dispatch]
  );
  useEventListener('paste', pasteHandler);

  let [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
  if (entry === null && cross !== null) {
    dispatch({ type: 'CHANGEDIRECTION' });
    [entry, cross] = [cross, entry];
  }

  const keyboardHandler = useCallback(
    (key: string) => {
      const mkey = fromKeyString(key);
      if (isSome(mkey)) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
        dispatch(kpa);
      }
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

  const isEmbed = useContext(EmbedContext);

  /* `clueMap` is a map from ENTRYWORD => '5D: This is the clue' - we use this
   *    for comment clue tooltips. */
  const clueMap = useMemo(() => {
    return getEntryToClueMap(state.grid, state.answers);
  }, [state.grid, state.answers]);

  /* `refs` is a set of referenced entry indexes for each entry in the grid - we use this
   * for grid highlights when an entry is selected.
   *
   * `refPositions` is an array for each entry of [reffedEntry, clueTextStart, clueTextEnd] tuples
   */
  const [refs, refPositions] = useMemo(() => {
    return getRefs(state.grid);
  }, [state.grid]);

  const scrollToCross = useMatchMedia(SMALL_AND_UP_RULES);

  const overlayBaseProps: PuzzleOverlayBaseProps = {
    publishTime: puzzle.isPrivateUntil || puzzle.publishTime,
    coverImage: props.coverImage,
    profilePicture: props.profilePicture,
    downsOnly: state.downsOnly,
    clueMap: clueMap,
    user: props.user,
    nextPuzzle: props.nextPuzzle,
    puzzle: puzzle,
    isMuted: muted,
    solveTime: state.displaySeconds,
    didCheat: state.didCheat,
    dispatch: dispatch,
  };

  let puzzleView: ReactNode;

  const entryIdx = entryIndexAtPosition(state.grid, state.active);
  let refed: Set<number> = new Set();
  if (entryIdx !== null) {
    refed = refs[entryIdx] || new Set();
  }

  const shouldConceal =
    state.currentTimeWindowStart === 0 &&
    !(state.success && state.dismissedSuccess);
  if (state.clueView) {
    puzzleView = (
      <TwoCol
        left={
          <ClueList
            isEnteringRebus={state.isEnteringRebus}
            rebusValue={state.rebusValue}
            wasEntryClick={state.wasEntryClick}
            allEntries={state.grid.entries}
            refPositions={refPositions}
            refed={refed}
            dimCompleted={true}
            active={state.active}
            grid={state.grid}
            showEntries={true}
            conceal={shouldConceal}
            header={t`Across`}
            entries={acrossEntries}
            current={entry?.index}
            cross={cross?.index}
            scrollToCross={scrollToCross}
            dispatch={dispatch}
            downsOnly={state.downsOnly && !state.success}
          />
        }
        right={
          <ClueList
            isEnteringRebus={state.isEnteringRebus}
            rebusValue={state.rebusValue}
            wasEntryClick={state.wasEntryClick}
            allEntries={state.grid.entries}
            refPositions={refPositions}
            refed={refed}
            dimCompleted={true}
            active={state.active}
            grid={state.grid}
            showEntries={true}
            conceal={shouldConceal}
            header={t`Down`}
            entries={downEntries}
            current={entry?.index}
            cross={cross?.index}
            scrollToCross={scrollToCross}
            dispatch={dispatch}
            downsOnly={state.downsOnly && !state.success}
          />
        }
      />
    );
  } else {
    puzzleView = (
      <SquareAndCols
        leftIsActive={state.active.dir === Direction.Across}
        waitToResize={state.waitToResize}
        dispatch={dispatch}
        aspectRatio={state.grid.width / state.grid.height}
        square={(width: number, _height: number) => {
          return (
            <GridView
              isEnteringRebus={state.isEnteringRebus}
              rebusValue={state.rebusValue}
              squareWidth={width}
              grid={state.grid}
              active={state.active}
              entryRefs={refs}
              dispatch={dispatch}
              revealedCells={state.revealedCells}
              verifiedCells={state.verifiedCells}
              wrongCells={state.wrongCells}
              showAlternates={state.success ? state.alternateSolutions : null}
              answers={state.answers}
            />
          );
        }}
        header={
          <div
            css={{
              height: SQUARE_HEADER_HEIGHT,
              fontSize: 18,
              lineHeight: '24px',
              backgroundColor: 'var(--lighter)',
              overflowY: 'scroll',
              scrollbarWidth: 'none',
              display: 'flex',
            }}
          >
            {entry ? (
              <div css={{ margin: 'auto 1em' }}>
                <span
                  css={{
                    fontWeight: 'bold',
                    paddingRight: '0.5em',
                  }}
                >
                  {entry.labelNumber}
                  {entry.direction === Direction.Across ? 'A' : 'D'}
                </span>
                <span
                  css={{
                    color: shouldConceal ? 'transparent' : 'var(--text)',
                    textShadow: shouldConceal
                      ? '0 0 1em var(--conceal-text)'
                      : '',
                  }}
                >
                  <ClueText
                    refPositions={refPositions}
                    entryIndex={entry.index}
                    allEntries={state.grid.entries}
                    grid={state.grid}
                    downsOnly={state.downsOnly && !state.success}
                  />
                </span>
              </div>
            ) : (
              ''
            )}
          </div>
        }
        left={
          <ClueList
            wasEntryClick={state.wasEntryClick}
            scrollToCross={scrollToCross}
            allEntries={state.grid.entries}
            refPositions={refPositions}
            refed={refed}
            dimCompleted={true}
            active={state.active}
            grid={state.grid}
            showEntries={false}
            conceal={shouldConceal}
            header={t`Across`}
            entries={acrossEntries}
            current={entry?.index}
            cross={cross?.index}
            dispatch={dispatch}
            downsOnly={state.downsOnly && !state.success}
          />
        }
        right={
          <ClueList
            wasEntryClick={state.wasEntryClick}
            scrollToCross={scrollToCross}
            allEntries={state.grid.entries}
            refPositions={refPositions}
            refed={refed}
            dimCompleted={true}
            active={state.active}
            grid={state.grid}
            showEntries={false}
            conceal={shouldConceal}
            header={t`Down`}
            entries={downEntries}
            current={entry?.index}
            cross={cross?.index}
            dispatch={dispatch}
            downsOnly={state.downsOnly && !state.success}
          />
        }
      />
    );
  }

  const checkRevealMenus = useMemo(
    () => (
      <>
        <TopBarDropDown icon={<FaEye />} text={t`Reveal`}>
          {() => (
            <>
              <TopBarDropDownLink
                icon={<RevealSquare />}
                text={t`Reveal Square`}
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
                text={t`Reveal Word`}
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
                text={t`Reveal Puzzle`}
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
          <TopBarDropDown icon={<FaCheck />} text={t`Check`}>
            {() => (
              <>
                <TopBarDropDownLink
                  icon={<FaCheckSquare />}
                  text={t`Autocheck`}
                  onClick={() => {
                    const action: ToggleAutocheckAction = {
                      type: 'TOGGLEAUTOCHECK',
                    };
                    dispatch(action);
                  }}
                />
                <TopBarDropDownLink
                  icon={<CheckSquare />}
                  text={t`Check Square`}
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
                  text={t`Check Word`}
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
                  text={t`Check Puzzle`}
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
            text={t`Autochecking`}
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
        <TopBarDropDown icon={<FaEllipsisH />} text={t`More`}>
          {() => (
            <>
              {!state.success ? (
                <TopBarDropDownLink
                  icon={<Rebus />}
                  text={t`Enter Rebus`}
                  shortcutHint={<EscapeKey />}
                  onClick={() => {
                    const kpa: KeypressAction = {
                      type: 'KEYPRESS',
                      key: { k: KeyK.Escape },
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
                  text={t`Unmute`}
                  onClick={() => setMuted(false)}
                />
              ) : (
                <TopBarDropDownLink
                  icon={<FaVolumeMute />}
                  text={t`Mute`}
                  onClick={() => setMuted(true)}
                />
              )}
              <TopBarDropDownLink
                icon={<FaKeyboard />}
                text={t`Toggle Keyboard`}
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
                    href={`/crosswords/${puzzle.id}/stats`}
                    icon={<IoMdStats />}
                    text={t`Stats`}
                  />
                  <TopBarDropDownLinkA
                    href={`/crosswords/${puzzle.id}/edit`}
                    icon={<FaEdit />}
                    text={t`Edit`}
                  />
                  {!isEmbed ? (
                    <TopBarDropDownLink
                      icon={<ImEmbed />}
                      text={t`Embed`}
                      onClick={() => dispatch({ type: 'TOGGLEEMBEDOVERLAY' })}
                    />
                  ) : (
                    ''
                  )}
                </>
              ) : (
                ''
              )}
              <TopBarDropDownLinkSimpleA
                href={'/api/pdf/' + puzzle.id}
                icon={<FaPrint />}
                text={t`Print Puzzle`}
              />
              <TopBarDropDownLinkSimpleA
                href={'/api/puz/' + puzzle.id}
                icon={<FaRegFile />}
                text={t`Download .puz File`}
              />
              <TopBarDropDownLinkA
                href="/account"
                icon={<FaUser />}
                text={t`Account / Settings`}
              />
              <TopBarDropDownLinkA
                href="/construct"
                icon={<FaHammer />}
                text={t`Construct a Puzzle`}
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
      isEmbed,
    ]
  );

  const description = puzzle.blogPost
    ? puzzle.blogPost.slice(0, 160) + '...'
    : puzzle.clues.map(getClueText).sort().slice(0, 10).join('; ');

  const locale = router.locale || 'en';

  return (
    <>
      <Head>
        <title>{puzzle.title} | Crosshare crossword puzzle</title>
        <I18nTags locale={locale} canonicalPath={`/crosswords/${puzzle.id}`} />
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
          <TopBar title={puzzle.title}>
            {!loadingPlayState ? (
              !state.success ? (
                <>
                  <TopBarLink
                    icon={<FaPause />}
                    hoverText={t`Pause Game`}
                    text={timeString(state.displaySeconds, true)}
                    onClick={() => {
                      dispatch({ type: 'PAUSEACTION' });
                      writePlayToDBIfNeeded();
                    }}
                    keepText={true}
                  />
                  <TopBarLink
                    icon={state.clueView ? <SpinnerFinished /> : <FaListOl />}
                    text={state.clueView ? t`Grid` : t`Clues`}
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
                    text={
                      puzzle.contestAnswers?.length
                        ? !isMetaSolution(
                            state.contestSubmission,
                            puzzle.contestAnswers
                          ) && !state.contestRevealed
                          ? t`Contest Prompt / Submission`
                          : t`Comments / Leaderboard`
                        : t`Show Comments`
                    }
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
        {state.filled && !state.success && !state.dismissedKeepTrying ? (
          <KeepTryingOverlay dispatch={dispatch} />
        ) : (
          ''
        )}
        {state.success && !state.dismissedSuccess ? (
          <PuzzleOverlay
            {...overlayBaseProps}
            overlayType={OverlayType.Success}
            contestSubmission={state.contestSubmission}
            contestHasPrize={puzzle.contestHasPrize}
            contestRevealed={state.contestRevealed}
            contestRevealDelay={puzzle.contestRevealDelay}
          />
        ) : (
          ''
        )}
        {state.moderating ? (
          <ModeratingOverlay puzzle={puzzle} dispatch={dispatch} />
        ) : (
          ''
        )}
        {state.showingEmbedOverlay && props.user ? (
          <EmbedOverlay user={props.user} puzzle={puzzle} dispatch={dispatch} />
        ) : (
          ''
        )}
        {state.currentTimeWindowStart === 0 &&
        !state.success &&
        !(state.filled && !state.dismissedKeepTrying) ? (
          state.bankedSeconds === 0 ? (
            <PuzzleOverlay
              {...overlayBaseProps}
              overlayType={OverlayType.BeginPause}
              dismissMessage={t`Begin Puzzle`}
              message={t`Ready to get started?`}
              loadingPlayState={loadingPlayState || !state.loadedPlayState}
            />
          ) : (
            <PuzzleOverlay
              {...overlayBaseProps}
              overlayType={OverlayType.BeginPause}
              dismissMessage={t`Resume`}
              message={t`Your puzzle is paused`}
              loadingPlayState={loadingPlayState || !state.loadedPlayState}
            />
          )
        ) : (
          ''
        )}
        <div
          css={{
            flex: '1 1 auto',
            overflow: 'scroll',
            scrollbarWidth: 'none',
            position: 'relative',
          }}
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
