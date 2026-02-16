import useEventListener from '@use-it/event-listener';
import { arrayRemove, arrayUnion, updateDoc } from 'firebase/firestore';
import Head from 'next/head';
import { useCallback, useMemo, useReducer, useState } from 'react';
import { CSVLink } from 'react-csv';
import { FaShareSquare } from 'react-icons/fa';
import {
  MetaSubmissionForStatsViewT,
  PuzzleStatsViewT,
} from '../lib/dbtypes.js';
import { getDocRef } from '../lib/firebaseWrapper.js';
import { entryAndCrossAtPosition } from '../lib/gridBase.js';
import { useMatchMedia } from '../lib/hooks.js';
import { markdownToHast } from '../lib/markdown/markdown.js';
import { SMALL_AND_UP_RULES } from '../lib/style.js';
import { Direction, PuzzleResult, fromKeyboardEvent } from '../lib/types.js';
import {
  clsx,
  isMetaSolution,
  logAsyncErrors,
  timeString,
} from '../lib/utils.js';
import {
  fromCells,
  getClueMap,
  getCluedAcrossAndDown,
} from '../lib/viewableGrid.js';
import {
  BuilderState,
  builderReducer,
  initialBuilderState,
} from '../reducers/builderReducer.js';
import { KeypressAction } from '../reducers/commonActions.js';
import { ButtonAsLink } from './Buttons.js';
import { ClueList } from './ClueList.js';
import { CopyableInput } from './CopyableInput.js';
import { Emoji } from './Emoji.js';
import { GridView } from './Grid.js';
import { Overlay } from './Overlay.js';
import { SquareAndCols } from './Page.js';
import styles from './PuzzleStats.module.scss';
import { useSnackbar } from './Snackbar.js';
import { ColumnSpec, Table } from './Table.js';
import { DefaultTopBar, TopBarLink } from './TopBar.js';

export enum StatsMode {
  AverageTime,
  AverageEditCount,
  MetaSubmissions,
}

interface MetaSubmissionListProps {
  // eslint-disable-next-line react/no-unused-prop-types
  puzzle: Omit<PuzzleResult, 'comments'>;
  stats: PuzzleStatsViewT;
}

interface TableData extends MetaSubmissionForStatsViewT {
  d: string;
  r: string;
  p: string[];
}

const MetaSubmissionList = (props: MetaSubmissionListProps) => {
  const [showingPreviousGuesses, setShowingPreviousGuesses] = useState<
    string[]
  >([]);
  const { showSnackbar } = useSnackbar();
  const [subs, setSubs] = useState(
    props.stats.ct_subs?.map((n) => ({
      d: (typeof n.t === 'number' ? new Date(n.t) : n.t.toDate()).toISOString(),
      r: n.rv ? 'Yes' : 'No',
      p: n.gs ?? [],
      ...n,
    }))
  );
  if (!subs || subs.length === 0) {
    return <p>No submissions yet - data is updated once per hour.</p>;
  }

  const onSort = (col: keyof TableData, dir: 1 | -1) => {
    const newSubs = [...subs];
    newSubs.sort((x, y) => {
      if (col === 'p') {
        if (x.p.length < y.p.length) return dir;
        if (y.p.length < x.p.length) return -dir;
        return 0;
      }
      const xcol = x[col]?.toString().trim().toLocaleLowerCase() || '',
        ycol = y[col]?.toString().trim().toLocaleLowerCase() || '';
      if (xcol < ycol) return dir;
      if (xcol > ycol) return -dir;
      return 0;
    });
    console.log(newSubs);
    setSubs(newSubs);
  };

  const columns: ColumnSpec<TableData>[] = [
    { key: 'n', header: 'Submitter', sortable: true },
    {
      key: 's',
      header: 'Submission',
      sortable: true,
      content: (row) => {
        const isSolution = isMetaSolution(
          row.s,
          props.puzzle.contestAnswers,
          [],
          props.puzzle.id
        );
        return (
          <>
            {isSolution ? <Emoji symbol="✅" /> : <Emoji symbol="❌" />} {row.s}{' '}
            {!isSolution && row.s.trim().length > 0 ? (
              <>
                (
                <ButtonAsLink
                  text="Accept as solution"
                  onClick={logAsyncErrors(async () => {
                    await updateDoc(getDocRef('c', props.puzzle.id), {
                      ct_ans: arrayUnion(row.s),
                    }).then(() => {
                      showSnackbar(
                        <>
                          Solution marked as accepted (
                          <ButtonAsLink
                            text="undo"
                            onClick={logAsyncErrors(async () => {
                              await updateDoc(getDocRef('c', props.puzzle.id), {
                                ct_ans: arrayRemove(row.s),
                              }).then(() => {
                                showSnackbar('Undo was successful');
                              });
                            })}
                          />
                          ) - it may take up to an hour for the leaderboard to
                          update
                        </>
                      );
                    });
                  })}
                />
                )
              </>
            ) : (
              ''
            )}
          </>
        );
      },
    },
    {
      key: 'd',
      header: 'Date',
      sortable: true,
    },
    {
      key: 'p',
      header: '# of Prior Submissions',
      sortable: true,
      content: (row) => {
        if (row.p.length === 0) {
          return <span>0</span>;
        }
        return (
          <ButtonAsLink
            onClick={() => {
              setShowingPreviousGuesses(row.p);
            }}
          >
            {row.p.length}
          </ButtonAsLink>
        );
      },
    },
    {
      key: 'r',
      header: 'Revealed',
      sortable: true,
    },
  ];
  if (props.puzzle.contestHasPrize) {
    columns.push({ key: 'e', header: 'Email', sortable: true });
  }

  return (
    <>
      {showingPreviousGuesses.length > 0 ? (
        <Overlay
          closeCallback={() => {
            setShowingPreviousGuesses([]);
          }}
        >
          <ul>
            {showingPreviousGuesses.map((g) => {
              return <li key={g}>{g}</li>;
            })}
          </ul>
        </Overlay>
      ) : (
        <></>
      )}
      <p className="margin1em">
        <CSVLink
          data={subs.map((s) => ({
            ...s,
            r: s.rv ? 'Yes' : 'No',
            p: (s.gs ?? []).length.toString(),
            c: isMetaSolution(
              s.s,
              props.puzzle.contestAnswers,
              [],
              props.puzzle.id
            )
              ? 'true'
              : 'false',
          }))}
          headers={[
            { label: 'Name', key: 'n' },
            { label: 'Submission', key: 's' },
            { label: 'Correct?', key: 'c' },
            { label: 'Revealed?', key: 'r' },
            { label: 'Num. Prior Submissions', key: 'p' },
            { label: 'Email', key: 'e' },
            { label: 'Date', key: 'd' },
          ]}
          filename={`${props.puzzle.title}.csv`}
          target="_blank"
        >
          Download submission table as CSV
        </CSVLink>
      </p>
      <div className="margin1em">
        <Table data={subs} columns={columns} onSort={onSort} />
      </div>
    </>
  );
};

interface PuzzleStatsProps extends MetaSubmissionListProps {
  mode: StatsMode;
}

const initializeState = (props: PuzzleStatsProps): BuilderState => {
  const viewableGrid = fromCells({
    cells: props.puzzle.grid,
    width: props.puzzle.size.cols,
    height: props.puzzle.size.rows,
    vBars: new Set(props.puzzle.vBars),
    hBars: new Set(props.puzzle.hBars),
    hidden: new Set(props.puzzle.hidden),
    allowBlockEditing: false,
    cellStyles: new Map<string, Set<number>>(),
    mapper: (e) => e,
  });

  return initialBuilderState({
    id: props.puzzle.id,
    width: props.puzzle.size.cols,
    height: props.puzzle.size.rows,
    grid: props.puzzle.grid,
    cellStyles: {},
    hidden: props.puzzle.hidden,
    vBars: props.puzzle.vBars,
    hBars: props.puzzle.hBars,
    title: props.puzzle.title,
    notes: props.puzzle.constructorNotes,
    clues: getClueMap(viewableGrid, props.puzzle.clues),
    authorId: props.puzzle.authorId,
    authorName: props.puzzle.authorName,
    editable: false,
    isPrivate: false,
    isPrivateUntil: null,
    blogPost: props.puzzle.blogPost,
    guestConstructor: props.puzzle.guestConstructor,
    contestAnswers: props.puzzle.contestAnswers,
    contestHasPrize: props.puzzle.contestHasPrize,
    contestRevealDelay: props.puzzle.contestRevealDelay,
    alternates: null,
    userTags: [],
  });
};

const PuzzleStats = (props: PuzzleStatsProps): React.JSX.Element => {
  const [state, dispatch] = useReducer(builderReducer, props, initializeState);

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      const mkey = fromKeyboardEvent(e);
      if (mkey !== null) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey };
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

  const [acrossEntries, downEntries] = useMemo(() => {
    return getCluedAcrossAndDown(
      state.clues,
      state.grid.entries,
      state.grid.sortedEntries,
      (c: string) => markdownToHast({ text: c })
    );
  }, [state.grid.entries, state.grid.sortedEntries, state.clues]);

  const normalizedColors = useMemo(() => {
    const data =
      props.mode === StatsMode.AverageTime ? props.stats.ct : props.stats.uc;
    const max = Math.max(...data);
    const min = Math.min(...data.filter((v) => v));

    return data.map((v) => (max - min ? (v - min) / (max - min) : 0));
  }, [props.stats.ct, props.stats.uc, props.mode]);

  const scrollToCross = useMatchMedia(SMALL_AND_UP_RULES);

  return (
    <SquareAndCols
      leftIsActive={state.active.dir === Direction.Across}
      aspectRatio={state.grid.width / state.grid.height}
      dispatch={dispatch}
      square={
        <GridView
          grid={state.grid}
          cellColors={normalizedColors}
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
  );
};

export const StatsPage = ({
  puzzle,
  stats,
  hideShare,
}: {
  puzzle: Omit<PuzzleResult, 'comments'>;
  stats: PuzzleStatsViewT | null;
  hideShare?: boolean;
}) => {
  const [mode, setMode] = useState(StatsMode.AverageTime);
  const [dropped, setDropped] = useState(false);
  const isMeta = puzzle.isContest;

  return (
    <>
      <Head>
        <title>{`Stats | ${puzzle.title} | Crosshare`}</title>
      </Head>
      <div className={styles.page}>
        <div className="flexNone">
          <DefaultTopBar>
            {!hideShare && stats?.sct ? (
              <>
                <TopBarLink
                  onClick={() => {
                    setDropped(!dropped);
                  }}
                  text="Share"
                  icon={<FaShareSquare />}
                />
                <Overlay
                  closeCallback={() => {
                    setDropped(false);
                  }}
                  hidden={!dropped}
                >
                  <>
                    <h3>Share these stats</h3>
                    <p>
                      Copy the secret URL below to share these stats. Anybody
                      who has the URL will be able to view this page.
                    </p>
                    <CopyableInput
                      text={`https://crosshare.org/sharedstats/${puzzle.id}/${stats.sct}`}
                    />
                  </>
                </Overlay>
              </>
            ) : (
              <></>
            )}
          </DefaultTopBar>
        </div>
        <div className={styles.main}>
          {stats ? (
            <>
              <h3 className="width100">
                Stats for <b>{puzzle.title}</b>
              </h3>
              <div data-is-meta={isMeta} className={styles.stats}>
                <div className={styles.col}>
                  <div>Total completions: {stats.n}</div>
                  <div>
                    Average completion time:{' '}
                    {stats.n && timeString(stats.nt / stats.n, true)}
                  </div>
                </div>
                <div className={styles.col}>
                  <div>Completions without helpers: {stats.s}</div>
                  <div>
                    Average time without helpers:{' '}
                    {stats.s && timeString(stats.st / stats.s, true)}
                  </div>
                </div>
                {isMeta ? (
                  <div className={styles.col}>
                    <div>
                      Correct contest submissions:{' '}
                      {stats.ct_subs?.filter((sub) =>
                        isMetaSolution(
                          sub.s,
                          puzzle.contestAnswers,
                          [],
                          puzzle.id
                        )
                      ).length ?? 0}
                    </div>
                    <div>
                      Total contest submissions: {stats.ct_subs?.length ?? 0}
                    </div>
                  </div>
                ) : (
                  ''
                )}
              </div>
              <div className={styles.switcher}>
                <ButtonAsLink
                  className="marginRight0-5em"
                  disabled={mode === StatsMode.AverageTime}
                  onClick={() => {
                    setMode(StatsMode.AverageTime);
                  }}
                  text="Time to Correct"
                />
                <ButtonAsLink
                  className={clsx(
                    'marginLeft0-5em',
                    isMeta && 'marginRight0-5em'
                  )}
                  disabled={mode === StatsMode.AverageEditCount}
                  onClick={() => {
                    setMode(StatsMode.AverageEditCount);
                  }}
                  text="Number of Edits"
                />
                {isMeta ? (
                  <ButtonAsLink
                    className="marginLeft0-5em"
                    disabled={mode === StatsMode.MetaSubmissions}
                    onClick={() => {
                      setMode(StatsMode.MetaSubmissions);
                    }}
                    text="Contest Submissions"
                  />
                ) : (
                  ''
                )}
              </div>
            </>
          ) : (
            <p>
              We don&apos;t have stats for this puzzle yet. Stats are updated
              once per hour, and won&apos;t be available until after a
              non-author has solved the puzzle.
            </p>
          )}
        </div>
        {stats ? (
          mode === StatsMode.MetaSubmissions ? (
            <div className={styles.submissionsList}>
              <MetaSubmissionList puzzle={puzzle} stats={stats} />
            </div>
          ) : (
            <div className={styles.statsArea}>
              <PuzzleStats puzzle={puzzle} stats={stats} mode={mode} />
            </div>
          )
        ) : (
          ''
        )}
      </div>
    </>
  );
};
