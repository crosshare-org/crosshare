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
    const db = App.firestore();
    db.collection('c').doc(puzzleId).get()
      .then(dbres => {
        if (!dbres.exists) {
          setError('No pending puzzle found');
        }
        const validationResult = DBPuzzleV.decode(dbres.data());
        if (isRight(validationResult)) {
          console.log('loaded puzzle from db');
          setPuzzle({ ...puzzleFromDB(validationResult.right), id: dbres.id });
        } else {
          console.error(PathReporter.report(validationResult).join(','));
          setError('Malformed pending puzzle found');
        }
      })
      .catch((e) => {
        console.error(e);
        setError(typeof e === 'string' ? e : 'error loading puzzle');
      });
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

  useEffect(() => {
    getFromSessionOrDB({
      collection: 's',
      docId: puzzle.id,
      validator: PuzzleStatsV,
      ttl: 30 * 60 * 1000
    })
      .then(setStats)
      .catch(setError);
  }, [puzzle.id]);

  if (error) {
    return <ErrorPage title='Error Loading Stats'>
      <p>Either something went wrong, or we don&apos;t have stats for this puzzle yet. Stats are updated once per hour, and won&apos; be available until after a non-author has solved the puzzle.</p>
    </ErrorPage>;
  }
  if (stats === null) {
    return <div>Loading stats...</div>;
  }

  return (
    <>
      <Head>
        <title>Stats | {puzzle.title} | Crosshare</title>
      </Head>
      <DefaultTopBar />
      <div>Stats for <b>{puzzle.title}</b> as of {stats.ua.toDate().toLocaleTimeString()}</div>
      <div>Total Completions: {stats.n}</div>
      <div>Average Completion Time: {stats.n && timeString(stats.nt / stats.n, true)}</div>
      <div>Non-cheating Completions: {stats.s}</div>
      <div>Average Non-Cheating Completion Time: {stats.s && timeString(stats.st / stats.s, true)}</div>
    </>
  );
};
