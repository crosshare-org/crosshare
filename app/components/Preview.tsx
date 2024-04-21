import { useReducer, useCallback, useMemo, useState } from 'react';
import useEventListener from '@use-it/event-listener';
import { FaRegNewspaper, FaListOl } from 'react-icons/fa';

import { Timestamp } from '../lib/timestamp';
import { Emoji } from './Emoji';
import { TopBarLink, DefaultTopBar } from './TopBar';
import { ClueList } from './ClueList';
import { AuthProps } from './AuthHelpers';
import { ConstructorNotes } from './ConstructorNotes';
import { GridView } from './Grid';
import { Overlay } from './Overlay';
import { PublishOverlay } from './PublishOverlay';
import { entryAndCrossAtPosition } from '../lib/gridBase';
import {
  builderReducer,
  initialBuilderState,
  BuilderState,
  PublishAction,
  getClueProps,
} from '../reducers/builderReducer';
import { KeypressAction } from '../reducers/gridReducer';
import { SquareAndCols } from './Page';
import {
  PuzzleInProgressT,
  Direction,
  fromKeyboardEvent,
  dbCluesToClueTArray,
} from '../lib/types';
import { useMatchMedia } from '../lib/hooks';
import { SMALL_AND_UP_RULES } from '../lib/style';
import { ClueMode } from './ClueMode';
import { ContactLinks } from './ContactLinks';
import { addClues } from '../lib/viewableGrid';
import { isSome } from 'fp-ts/lib/Option';
import { markdownToHast } from '../lib/markdown/markdown';
import { GridContext } from './GridContext';

const initializeState = (
  props: PuzzleInProgressT & AuthProps
): BuilderState => {
  return initialBuilderState({
    id: null,
    blogPost: null,
    guestConstructor: null,
    commentsDisabled: props.prefs?.disableCommentsByDefault,
    width: props.width,
    height: props.height,
    grid: props.grid,
    vBars: props.vBars || [],
    hBars: props.hBars || [],
    hidden: props.hidden || [],
    highlighted: props.highlighted,
    highlight: props.highlight,
    title: props.title,
    notes: props.notes,
    clues: props.clues,
    authorId: props.user.uid,
    authorName: props.user.displayName || 'Anonymous',
    editable: false,
    isPrivate: false,
    isPrivateUntil: null,
    contestAnswers: null,
    contestHasPrize: false,
    contestRevealDelay: null,
    alternates: null,
    userTags: [],
  });
};

export const Preview = (props: PuzzleInProgressT & AuthProps): JSX.Element => {
  const [state, dispatch] = useReducer(builderReducer, props, initializeState);
  const [dismissedIntro, setDismissedIntro] = useState(false);

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      const mkey = fromKeyboardEvent(e);
      if (isSome(mkey)) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
        dispatch(kpa);
        e.preventDefault();
      }
    },
    [dispatch]
  );
  useEventListener('keydown', physicalKeyboardHandler);

  let [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
  if (entry === null) {
    if (cross !== null) {
      dispatch({ type: 'CHANGEDIRECTION' });
      [entry, cross] = [cross, entry];
    }
  }

  const cluedGrid = useMemo(() => {
    const clueProps = getClueProps(
      state.grid.sortedEntries,
      state.grid.entries,
      state.clues,
      false
    );
    const clueArray = dbCluesToClueTArray(
      clueProps.ac,
      clueProps.an,
      clueProps.dc,
      clueProps.dn
    );
    return addClues(state.grid, clueArray, (c: string) =>
      markdownToHast({ text: c, inline: true })
    );
  }, [state.grid, state.clues]);

  const { acrossEntries, downEntries } = useMemo(() => {
    return {
      acrossEntries: cluedGrid.entries.filter(
        (e) => e.direction === Direction.Across
      ),
      downEntries: cluedGrid.entries.filter(
        (e) => e.direction === Direction.Down
      ),
    };
  }, [cluedGrid.entries]);

  const scrollToCross = useMatchMedia(SMALL_AND_UP_RULES);

  const [clueMode, setClueMode] = useState(false);
  if (clueMode) {
    return (
      <ClueMode
        state={state}
        puzzleId={state.id}
        authorId={state.authorId}
        dispatch={dispatch}
        blogPost={state.blogPost}
        guestConstructor={state.guestConstructor}
        title={state.title}
        notes={state.notes}
        clues={state.clues}
        completedEntries={state.grid.entries.filter((e) => e.completedWord)}
        exitClueMode={() => {
          setClueMode(false);
        }}
        user={props.user}
      />
    );
  }

  return (
    <>
      <GridContext.Provider value={cluedGrid}>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <div className="flexNone">
            <DefaultTopBar>
              <TopBarLink
                icon={<FaRegNewspaper />}
                text="Publish"
                onClick={() => {
                  const a: PublishAction = {
                    type: 'PUBLISH',
                    publishTimestamp: Timestamp.now(),
                  };
                  dispatch(a);
                }}
              />
              <TopBarLink
                icon={<FaListOl />}
                text="Edit"
                onClick={() => {
                  setClueMode(true);
                }}
              />
            </DefaultTopBar>
          </div>
          {state.toPublish ? (
            <PublishOverlay
              id={state.id}
              toPublish={state.toPublish}
              warnings={state.publishWarnings}
              user={props.user}
              cancelPublish={() => {
                dispatch({ type: 'CANCELPUBLISH' });
              }}
            />
          ) : (
            ''
          )}
          {state.publishErrors.length ? (
            <Overlay
              closeCallback={() => {
                dispatch({ type: 'CLEARPUBLISHERRORS' });
              }}
            >
              <>
                <div>
                  Please fix the following errors and try publishing again:
                </div>
                <ul>
                  {state.publishErrors.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </>
              {state.publishWarnings.length ? (
                <>
                  <div>Warnings:</div>
                  <ul>
                    {state.publishWarnings.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              ) : (
                ''
              )}
            </Overlay>
          ) : (
            ''
          )}
          {!dismissedIntro ? (
            <Overlay
              closeCallback={() => {
                setDismissedIntro(true);
              }}
            >
              <h2>
                <Emoji symbol="🎉" /> Successfully Imported{' '}
                {props.title ? <>&lsquo;{props.title}&rsquo;</> : ''}
              </h2>
              {props.notes ? (
                <ConstructorNotes
                  notes={markdownToHast({ text: props.notes })}
                />
              ) : (
                ''
              )}
              <p>
                Please look over your grid and clues to make sure everything is
                correct. If something didn&apos;t import correctly, get in touch
                with us via <ContactLinks />.
              </p>
              <p>
                You can edit your title, clues, etc. by clicking
                &lsquo;Edit&rsquo; in the top bar.
              </p>
              <p>
                Once you&apos;ve looked it over, click &lsquo;Publish&rsquo; in
                the top bar to publish your puzzle!
              </p>
            </Overlay>
          ) : (
            ''
          )}
          <div
            css={{ flex: '1 1 auto', overflow: 'scroll', position: 'relative' }}
          >
            <SquareAndCols
              leftIsActive={state.active.dir === Direction.Across}
              dispatch={dispatch}
              aspectRatio={state.grid.width / state.grid.height}
              square={
                <GridView
                  grid={state.grid}
                  active={state.active}
                  dispatch={dispatch}
                  allowBlockEditing={true}
                />
              }
              left={
                <ClueList
                  wasEntryClick={state.wasEntryClick}
                  dimCompleted={false}
                  active={state.active}
                  grid={state.grid}
                  showEntries={false}
                  conceal={false}
                  header="Across"
                  entries={acrossEntries}
                  current={entry?.index}
                  refed={new Set()}
                  cross={cross?.index}
                  scrollToCross={scrollToCross}
                  dispatch={dispatch}
                />
              }
              right={
                <ClueList
                  wasEntryClick={state.wasEntryClick}
                  dimCompleted={false}
                  active={state.active}
                  grid={state.grid}
                  showEntries={false}
                  conceal={false}
                  header="Down"
                  entries={downEntries}
                  current={entry?.index}
                  refed={new Set()}
                  cross={cross?.index}
                  scrollToCross={scrollToCross}
                  dispatch={dispatch}
                />
              }
            />
          </div>
        </div>
      </GridContext.Provider>
    </>
  );
};
