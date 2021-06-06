import Head from 'next/head';
import { useReducer, useCallback, useMemo, useState } from 'react';
import useEventListener from '@use-it/event-listener';
import orderBy from 'lodash/orderBy';
import { ClueList } from './ClueList';
import { GridView } from './Grid';
import { entryAndCrossAtPosition } from '../lib/gridBase';
import {
  builderReducer,
  initialBuilderState,
  BuilderState,
  KeypressAction,
} from '../reducers/reducer';
import { SquareAndCols } from './Page';
import { Direction, PuzzleResult } from '../lib/types';
import { PuzzleStatsViewT } from '../lib/dbtypes';
import {
  fromCells,
  getCluedAcrossAndDown,
  getClueMap,
} from '../lib/viewableGrid';
import { useMatchMedia } from '../lib/hooks';
import { SMALL_AND_UP, SMALL_AND_UP_RULES } from '../lib/style';
import { DefaultTopBar, TopBarLink } from './TopBar';
import { FaShareSquare } from 'react-icons/fa';
import { Overlay } from './Overlay';
import { CopyableInput } from './CopyableInput';
import { isMetaSolution, timeString } from '../lib/utils';
import { ButtonAsLink } from './Buttons';
import { ColumnProps, Table } from 'react-fluid-table';
import { Emoji } from './Emoji';
import { CSVLink } from 'react-csv';

export enum StatsMode {
  AverageTime,
  AverageEditCount,
  MetaSubmissions,
}

interface MetaSubmissionListProps {
  puzzle: PuzzleResult;
  stats: PuzzleStatsViewT;
}

const MetaSubmissionList = (props: MetaSubmissionListProps) => {
  const [subs, setSubs] = useState(
    props.stats.ct_subs?.map((n) => ({
      d: (typeof n.t === 'number' ? new Date(n.t) : n.t.toDate()).toISOString(),
      ...n,
    }))
  );
  if (!subs || subs.length === 0) {
    return <p>No submissions yet - data is updated once per hour.</p>;
  }

  const onSort = (col: string | null, dir: string | null) => {
    if (!subs || !col || !dir) {
      return;
    }
    setSubs(
      orderBy(subs, [col], [dir.toLowerCase() === 'asc' ? 'asc' : 'desc'])
    );
  };

  const columns: ColumnProps[] = [
    { key: 'n', header: 'Submitter', sortable: true },
    {
      key: 's',
      header: 'Submission',
      sortable: true,
      content: ({ row }) => (
        <>
          {isMetaSolution(row.s, props.puzzle.contestAnswers || []) ? (
            <Emoji symbol="✅" />
          ) : (
            <Emoji symbol="❌" />
          )}{' '}
          {row.s}
        </>
      ),
    },
    {
      key: 'd',
      header: 'Date',
      sortable: true,
    },
  ];
  if (props.puzzle.contestHasPrize) {
    columns.push({ key: 'e', header: 'Email', sortable: true });
  }

  return (
    <>
      <p css={{ margin: '1em' }}>
        <CSVLink
          data={subs.map((s) => ({
            ...s,
            c: isMetaSolution(s.s, props.puzzle.contestAnswers || [])
              ? 'true'
              : 'false',
          }))}
          headers={[
            { label: 'Name', key: 'n' },
            { label: 'Submission', key: 's' },
            { label: 'Correct?', key: 'c' },
            { label: 'Email', key: 'e' },
            { label: 'Date', key: 'd' },
          ]}
          filename={`${props.puzzle.title}.csv`}
          target="_blank"
        >
          Download submission table as CSV
        </CSVLink>
      </p>
      <div css={{ margin: '1em' }}>
        <Table
          css={{
            '& .cell': {
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              display: 'block !important',
            },
          }}
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
  });
};

export const PuzzleStats = (props: PuzzleStatsProps): JSX.Element => {
  const [state, dispatch] = useReducer(builderReducer, props, initializeState);

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
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

  const { acrossEntries, downEntries } = useMemo(() => {
    return getCluedAcrossAndDown(
      state.clues,
      state.grid.entries,
      state.grid.sortedEntries
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
      square={(width: number, _height: number) => {
        return (
          <GridView
            squareWidth={width}
            grid={state.grid}
            cellColors={normalizedColors}
            active={state.active}
            dispatch={dispatch}
            allowBlockEditing={true}
          />
        );
      }}
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
          downsOnly={false}
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
          downsOnly={false}
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
  puzzle: PuzzleResult;
  stats: PuzzleStatsViewT | null;
  hideShare?: boolean;
}) => {
  const [mode, setMode] = useState(StatsMode.AverageTime);
  const [dropped, setDropped] = useState(false);
  const isMeta = (puzzle.contestAnswers?.length || 0) > 0;

  return (
    <>
      <Head>
        <title>Stats | {puzzle.title} | Crosshare</title>
      </Head>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div css={{ flex: 'none' }}>
          <DefaultTopBar>
            {!hideShare && stats?.sct ? (
              <>
                <TopBarLink
                  onClick={() => setDropped(!dropped)}
                  text="Share"
                  icon={<FaShareSquare />}
                />
                <Overlay
                  closeCallback={() => setDropped(false)}
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
        <div
          css={{
            paddingTop: '0.5em',
            flex: 'none',
          }}
        >
          {stats ? (
            <>
              <h3 css={{ width: '100%' }}>
                Stats for <b>{puzzle.title}</b>
              </h3>
              <div
                css={{
                  [SMALL_AND_UP]: {
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  },
                }}
              >
                <div
                  css={{
                    [SMALL_AND_UP]: {
                      width: isMeta ? '31%' : '48%',
                    },
                  }}
                >
                  <div>Total completions: {stats.n}</div>
                  <div>
                    Average completion time:{' '}
                    {stats.n && timeString(stats.nt / stats.n, true)}
                  </div>
                </div>
                <div
                  css={{
                    [SMALL_AND_UP]: {
                      width: isMeta ? '31%' : '48%',
                    },
                  }}
                >
                  <div>Completions without helpers: {stats.s}</div>
                  <div>
                    Average time without helpers:{' '}
                    {stats.s && timeString(stats.st / stats.s, true)}
                  </div>
                </div>
                {isMeta ? (
                  <div
                    css={{
                      [SMALL_AND_UP]: {
                        width: '31%',
                      },
                    }}
                  >
                    <div>
                      Correct contest submissions:{' '}
                      {stats.ct_subs?.filter((sub) =>
                        isMetaSolution(sub.s, puzzle.contestAnswers || [])
                      ).length || 0}
                    </div>
                    <div>
                      Total contest submissions:
                      {stats.ct_subs?.length || 0}
                    </div>
                  </div>
                ) : (
                  ''
                )}
              </div>
              <div css={{ paddingTop: '1em', textAlign: 'center' }}>
                <ButtonAsLink
                  css={{ marginRight: '0.5em' }}
                  disabled={mode === StatsMode.AverageTime}
                  onClick={() => {
                    setMode(StatsMode.AverageTime);
                  }}
                  text="Time to Correct"
                />
                <ButtonAsLink
                  css={{
                    marginLeft: '0.5em',
                    marginRight: isMeta ? '0.5em' : 0,
                  }}
                  disabled={mode === StatsMode.AverageEditCount}
                  onClick={() => {
                    setMode(StatsMode.AverageEditCount);
                  }}
                  text="Number of Edits"
                />
                {isMeta ? (
                  <ButtonAsLink
                    css={{ marginLeft: '0.5em' }}
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
            <div
              css={{
                flex: '1 1 auto',
                position: 'relative',
              }}
            >
              <MetaSubmissionList puzzle={puzzle} stats={stats} />
            </div>
          ) : (
            <div
              css={{
                flex: '1 1 auto',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
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
