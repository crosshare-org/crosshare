import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Error from 'next/error';
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

export default requiresAuth((props: AuthProps) => {
  const router = useRouter();
  const { puzzleId } = router.query;
  if (!puzzleId) {
    return <div />;
  }
  if (Array.isArray(puzzleId)) {
    return <Error statusCode={400} title="Bad puzzle id" />;
  }
  return <PuzzleLoader key={puzzleId} puzzleId={puzzleId} auth={props} />;
});

const PuzzleLoader = ({ puzzleId, auth }: { puzzleId: string, auth: AuthProps }) => {
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
    return <Error statusCode={400} title={error} />;
  }
  if (!puzzle) {
    return <div>Loading...</div>;
  }

  if (!auth.isAdmin && auth.user.uid !== puzzle.authorId) {
    return <Error statusCode={403} title={'Stats are only available for the puzzle author'} />;
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
    return <Error statusCode={400} title={'Error loading stats: ' + error} />;
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
