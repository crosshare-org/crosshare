import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { requiresAuth, AuthProps } from '../../../components/AuthContext';
import { PuzzleResult, puzzleFromDB } from '../../../lib/types';
import { PuzzleStatsT, PuzzleStatsV, DBPuzzleV } from '../../../lib/dbtypes';
import { getFromSessionOrDB } from '../../../lib/dbUtils';
import { timeString } from '../../../lib/utils';
import { App } from '../../../lib/firebaseWrapper';
import { DefaultTopBar } from '../../../components/TopBar';
import { ErrorPage } from '../../../components/ErrorPage';
import { PuzzleStats, StatsMode } from '../../../components/PuzzleStats';
import { SMALL_AND_UP } from '../../../lib/style';
import { ButtonAsLink } from '../../../components/Buttons';

export default requiresAuth((props: AuthProps) => {
  const router = useRouter();
  const { puzzleId } = router.query;
  if (!puzzleId) {
    return <div />;
  }
  if (Array.isArray(puzzleId)) {
    return <ErrorPage title="Bad Puzzle Id" />;
  }
  return <PuzzleLoader key={puzzleId} puzzleId={puzzleId} auth={props} />;
});

// export for testing
export const PuzzleLoader = ({ puzzleId, auth }: { puzzleId: string, auth: AuthProps }) => {
  const [puzzle, setPuzzle] = useState<PuzzleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let didCancel = false;

    const fetchData = async () => {
      const db = App.firestore();
      db.collection('c').doc(puzzleId).get()
        .then(dbres => {
          if (didCancel) {
            return;
          }
          if (!dbres.exists) {
            setError('No puzzle found');
          }
          const validationResult = DBPuzzleV.decode(dbres.data());
          if (isRight(validationResult)) {
            console.log('loaded puzzle from db');
            setPuzzle({ ...puzzleFromDB(validationResult.right), id: dbres.id });
          } else {
            console.error(PathReporter.report(validationResult).join(','));
            setError('Malformed puzzle found');
          }
        })
        .catch((e) => {
          console.error(e);
          if (didCancel) {
            return;
          }
          setError(typeof e === 'string' ? e : 'error loading puzzle');
        });
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [puzzleId]);
  if (error) {
    return <ErrorPage title='Something Went Wrong'>
      <p>{error}</p>
    </ErrorPage >;
  }
  if (!puzzle) {
    return <div>Loading...</div>;
  }

  if (!auth.isAdmin && auth.user.uid !== puzzle.authorId) {
    return <ErrorPage title='Not Allowed'>
      <p>You do not have permission to view this page</p>
    </ErrorPage >;
  }
  return <StatsLoader puzzle={puzzle} />;
};

const StatsLoader = ({ puzzle }: { puzzle: PuzzleResult }) => {
  const [stats, setStats] = useState<PuzzleStatsT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [didLoad, setDidLoad] = useState<boolean>(false);
  const [mode, setMode] = useState(StatsMode.AverageTime);

  useEffect(() => {
    let didCancel = false;

    const fetchData = async () => {
      getFromSessionOrDB({
        collection: 's',
        docId: puzzle.id,
        validator: PuzzleStatsV,
        ttl: 30 * 60 * 1000
      })
        .then((s) => {
          if (didCancel) {
            return;
          }
          setStats(s);
          setDidLoad(true);
        })
        .catch((e) => {
          if (didCancel) {
            return;
          }
          setError(e);
          setDidLoad(true);
        });
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [puzzle.id]);

  if (error) {
    return <ErrorPage title='Error Loading Stats'>
      <p>Either something went wrong, or we don&apos;t have stats for this puzzle yet. Stats are updated once per hour, and won&apos;t be available until after a non-author has solved the puzzle.</p>
    </ErrorPage>;
  }
  if (!didLoad) {
    return <div>Loading stats...</div>;
  }

  return (
    <>
      <Head>
        <title>Stats | {puzzle.title} | Crosshare</title>
      </Head>
      <div css={{
        display: 'flex', flexDirection: 'column', height: '100%'
      }}>
        <div css={{ flex: 'none', }}>
          <DefaultTopBar />
        </div>
        <div css={{
          paddingTop: '0.5em', flex: 'none',
        }}>
          {stats ?
            <>
              <h3 css={{ width: '100%' }}>Stats for <b>{puzzle.title}</b></h3>
              <div css={{
                [SMALL_AND_UP]: {
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }
              }}>
                <div css={{
                  [SMALL_AND_UP]: {
                    width: '45%',
                  }
                }}>
                  <div>Total completions: {stats.n}</div>
                  <div>Average completion time: {stats.n && timeString(stats.nt / stats.n, true)}</div>
                </div>
                <div css={{
                  [SMALL_AND_UP]: {
                    width: '45%',
                  }
                }}>
                  <div>Completions without helpers: {stats.s}</div>
                  <div>Average time without helpers: {stats.s && timeString(stats.st / stats.s, true)}</div>
                </div>
              </div>
              <div css={{ paddingTop: '1em', textAlign: 'center' }}>
                <ButtonAsLink css={{ marginRight: '1em' }} disabled={mode === StatsMode.AverageTime} onClick={() => { setMode(StatsMode.AverageTime); }} text="Time to Correct" />
                <ButtonAsLink css={{ marginLeft: '1em' }} disabled={mode === StatsMode.AverageEditCount} onClick={() => { setMode(StatsMode.AverageEditCount); }} text="Number of Edits" />
              </div>
            </>
            :
            <p>We don&apos;t have stats for this puzzle yet. Stats are updated once per hour, and won&apos;t be available until after a non-author has solved the puzzle.</p>
          }
        </div>
        <div css={{ flex: '1 1 auto', overflow: 'hidden', position: 'relative' }}>
          {stats ?
            <PuzzleStats puzzle={puzzle} stats={stats} mode={mode} />
            :
            ''}
        </div>
      </div>
    </>
  );
};
