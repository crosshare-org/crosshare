import { useEffect, useMemo, useState } from 'react';
import {
  ConstructorStatsForPuzzleT,
  ConstructorStatsT,
  ConstructorStatsV,
  DBPuzzleT,
  DBPuzzleV,
} from '../lib/dbtypes';
import { Link } from '../components/Link';
import { getFromSessionOrDB } from '../lib/dbUtils';
import { timeString } from '../lib/utils';

const usePuzzleDoc = (
  puzzleId: string | undefined
): [DBPuzzleT | null, boolean] => {
  const [puzzle, setPuzzle] = useState<DBPuzzleT | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let didCancel = false;

    if (!puzzleId) {
      return;
    }

    const fetchData = async () => {
      getFromSessionOrDB({
        collection: 'c',
        docId: puzzleId,
        validator: DBPuzzleV,
        ttl: 30 * 60 * 1000,
      }).then((s) => {
        if (didCancel) {
          return;
        }
        setPuzzle(s);
        setDone(true);
      });
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [puzzleId]);
  return [puzzle, done];
};

const PuzzleLink = ({
  puzzleId,
  value,
  valueDisplay,
}: {
  puzzleId: string;
  value: number;
  valueDisplay?: (x: number) => string;
}) => {
  const [puzzle, done] = usePuzzleDoc(puzzleId);
  if (done && !puzzle) {
    return <></>;
  }
  return (
    <li>
      <Link href={'/crosswords/' + puzzleId}>
        {puzzle?.t || 'Loading title...'}
      </Link>{' '}
      ({valueDisplay ? valueDisplay(value) : value})
    </li>
  );
};

const PuzzleList = ({
  title,
  stats,
  filter,
  mapper,
  sortDesc,
  valueDisplay,
}: {
  title: string;
  stats: ConstructorStatsT;
  filter: (x: ConstructorStatsForPuzzleT) => boolean;
  mapper: (x: ConstructorStatsForPuzzleT) => number;
  valueDisplay?: (x: number) => string;
  sortDesc: boolean;
}) => {
  const matches = useMemo(
    () =>
      Object.entries(stats)
        .filter((a) => filter(a[1]))
        .map((a): [string, number] => [a[0], mapper(a[1])])
        .sort((a, b) => (sortDesc ? b[1] - a[1] : a[1] - b[1]))
        .slice(0, 5),
    [stats, filter, mapper, sortDesc]
  );
  if (!matches.length) return <></>;

  return (
    <>
      <h4>{title}:</h4>
      <ul css={{ listStyleType: 'none' }}>
        {matches.map((v, i) => (
          <PuzzleLink
            key={i}
            valueDisplay={valueDisplay}
            puzzleId={v[0]}
            value={v[1]}
          />
        ))}
      </ul>
    </>
  );
};

export const ConstructorStats = (props: { userId: string }) => {
  const [stats, setStats] = useState<ConstructorStatsT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let didCancel = false;

    const fetchData = async () => {
      getFromSessionOrDB({
        collection: 'cs',
        docId: props.userId,
        validator: ConstructorStatsV,
        ttl: 30 * 60 * 1000,
      })
        .then((s) => {
          if (didCancel) {
            return;
          }
          setStats(s);
          setLoading(false);
        })
        .catch((e) => {
          if (didCancel) {
            return;
          }
          console.log(e);
          setError(e);
          setLoading(false);
        });
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [props.userId]);

  return (
    <div>
      <h2>Stats (updated hourly)</h2>
      {error ? (
        <p>Error loading stats, please try again.</p>
      ) : loading ? (
        <p>Loading...</p>
      ) : stats ? (
        <>
          <p>
            <b>Total solves:</b>{' '}
            {Object.values(stats).reduce((a, b) => a + b.n, 0)}
          </p>
          <p>
            <b>Average solves per puzzle:</b>{' '}
            {Math.round(
              Object.values(stats).reduce((a, b) => a + b.n, 0) /
                Object.values(stats).length
            )}
          </p>
          <p>
            <b>Average solve time (w/o check/reveal)</b>:{' '}
            {timeString(
              Object.values(stats).reduce((a, b) => a + b.st, 0) /
                Object.values(stats).reduce((a, b) => a + b.s, 0),
              false
            )}
          </p>
          <PuzzleList
            title="Most solved puzzles"
            stats={stats}
            filter={(a) => a.n > 0}
            mapper={(a) => a.n}
            sortDesc={true}
          />
          <PuzzleList
            title="Best completion % w/o check/reveal (min 5 solves)"
            stats={stats}
            filter={(a) => a.n > 5}
            mapper={(a) => (100 * a.s) / a.n}
            valueDisplay={(a) => `${Math.round(a)}%`}
            sortDesc={true}
          />
          <PuzzleList
            title="Worst completion % w/o check/reveal (min 5 solves)"
            stats={stats}
            filter={(a) => a.n > 5}
            mapper={(a) => (100 * a.s) / a.n}
            valueDisplay={(a) => `${Math.round(a)}%`}
            sortDesc={false}
          />
          <PuzzleList
            title="Fastest avg. solve w/o check/reveal (min 5 solves)"
            stats={stats}
            filter={(a) => a.s > 5}
            mapper={(a) => a.st / a.s}
            valueDisplay={(a) => timeString(a, false)}
            sortDesc={false}
          />
          <PuzzleList
            title="Slowest avg. solve w/o check/reveal (min 5 solves)"
            stats={stats}
            filter={(a) => a.s > 5}
            mapper={(a) => a.st / a.s}
            valueDisplay={(a) => timeString(a, false)}
            sortDesc={true}
          />
          <PuzzleList
            title="Metas with the most submissions"
            stats={stats}
            filter={(a) => (a.ct_sub_n ? a.ct_sub_n > 0 : false)}
            mapper={(a) => a.ct_sub_n || 0}
            sortDesc={true}
          />
          <PuzzleList
            title="Metas with the most % correct submissions out of total solvers"
            stats={stats}
            filter={(a) => (a.ct_sub_n ? a.ct_sub_n > 0 : false)}
            mapper={(a) => (100 * (a.ct_sub_n || 0)) / a.n}
            valueDisplay={(a) => `${Math.round(a)}%`}
            sortDesc={true}
          />
          <PuzzleList
            title="Metas with the lowest % correct submissions out of total solvers"
            stats={stats}
            filter={(a) => (a.ct_sub_n ? a.ct_sub_n > 0 : false)}
            mapper={(a) => (100 * (a.ct_sub_n || 0)) / a.n}
            valueDisplay={(a) => `${Math.round(a)}%`}
            sortDesc={false}
          />
        </>
      ) : (
        <p>
          No stats yet - stats are updated hourly and won&apos;t be available
          until a non-author has solved one of your puzzles
        </p>
      )}
    </div>
  );
};
