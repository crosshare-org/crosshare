import useEventListener from '@use-it/event-listener';
import { arrayRemove, arrayUnion, updateDoc } from 'firebase/firestore';
import { isSome } from 'fp-ts/lib/Option';
import orderBy from 'lodash/orderBy';
import Head from 'next/head';
import { useCallback, useMemo, useReducer, useState } from 'react';
import { CSVLink } from 'react-csv';
import { ColumnProps, Table } from 'react-fluid-table';
import { FaShareSquare } from 'react-icons/fa';
import { MetaSubmissionForStatsViewT, PuzzleStatsViewT } from '../lib/dbtypes';
import { getDocRef } from '../lib/firebaseWrapper';
import { entryAndCrossAtPosition } from '../lib/gridBase';
import { useMatchMedia } from '../lib/hooks';
import { markdownToHast } from '../lib/markdown/markdown';
import { SMALL_AND_UP_RULES } from '../lib/style';
import { Direction, PuzzleResult, fromKeyboardEvent } from '../lib/types';
import { clsx, isMetaSolution, logAsyncErrors, timeString } from '../lib/utils';
import {
  fromCells,
  getClueMap,
  getCluedAcrossAndDown,
} from '../lib/viewableGrid';
import {
  BuilderState,
  builderReducer,
  initialBuilderState,
} from '../reducers/builderReducer';
import { KeypressAction } from '../reducers/commonActions';
import { ButtonAsLink } from './Buttons';
import { ClueList } from './ClueList';
import { CopyableInput } from './CopyableInput';
import { Emoji } from './Emoji';
import { GridView } from './Grid';
import { Overlay } from './Overlay';
import { SquareAndCols } from './Page';
import styles from './PuzzleStats.module.css';
import { useSnackbar } from './Snackbar';
import { DefaultTopBar, TopBarLink } from './TopBar';

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
  p: string;
}

const MetaSubmissionList = (props: MetaSubmissionListProps) => {
  const { showSnackbar } = useSnackbar();
  const [subs, setSubs] = useState(
    props.stats.ct_subs?.map((n) => ({
      d: (typeof n.t === 'number' ? new Date(n.t) : n.t.toDate()).toISOString(),
      r: n.rv ? 'Yes' : 'No',
      p: (n.gs ?? []).length.toString(),
      ...n,
    }))
  );
  if (!subs || subs.length === 0) {
    return <p>No submissions yet - data is updated once per hour.</p>;
  }

  const onSort = (col: string | null, dir: string | null) => {
    if (!col || !dir) {
      return;
    }
    setSubs(
      orderBy(
        subs,
        [col as keyof (typeof subs)[number]],
        [dir.toLowerCase() === 'asc' ? 'asc' : 'desc']
      )
    );
  };

  const columns: ColumnProps<TableData>[] = [
    { key: 'n', header: 'Submitter', sortable: true },
    {
      key: 's',
      header: 'Submission',
      sortable: true,
      content: ({ row }) => {
        const isSolution = isMetaSolution(
          row.s,
          props.puzzle.contestAnswers ?? []
        );
        return (
          <>
            {isSolution ? <Emoji symbol="✅" /> : <Emoji symbol="❌" />} {row.s}{' '}
            {!isSolution ? (
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
      <p className="margin1em">
        <CSVLink
          data={subs.map((s) => ({
            ...s,
            r: s.rv ? 'Yes' : 'No',
            p: (s.gs ?? []).length.toString(),
            c: isMetaSolution(s.s, props.puzzle.contestAnswers ?? [])
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
        <Table
          className={styles.metaTable}
          data={subs}
          columns={columns}
          onSort={onSort}
          sortColumn={'t'}
          sortDirection={'ASC'}
        />
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
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (e) => e,
  });

  return initialBuilderState({
    id: props.puzzle.id,
    width: props.puzzle.size.cols,
    height: props.puzzle.size.rows,
    grid: props.puzzle.grid,
    highlighted: props.puzzle.highlighted,
    hidden: props.puzzle.hidden,
    vBars: props.puzzle.vBars,
    hBars: props.puzzle.hBars,
    highlight: props.puzzle.highlight,
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

const PuzzleStats = (props: PuzzleStatsProps): JSX.Element => {
  const [state, dispatch] = useReducer(builderReducer, props, initializeState);

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
  const isMeta = (puzzle.contestAnswers?.length ?? 0) > 0;

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
                        isMetaSolution(sub.s, puzzle.contestAnswers ?? [])
                      ).length ?? 0}
                    </div>
                    <div>
                      Total contest submissions:
                      {stats.ct_subs?.length ?? 0}
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
