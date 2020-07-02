import NextJSRouter, { useRouter } from 'next/router';
import { useState, useEffect, useContext } from 'react';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { AuthContext, requiresAuth } from '../../components/AuthContext';
import { puzzleFromDB, PuzzleResult } from '../../lib/types';
import { Puzzle, NextPuzzleLink } from '../../components/Puzzle';
import { App, TimestampClass } from '../../lib/firebaseWrapper';
import { DBPuzzleV, PlayWithoutUserT } from '../../lib/dbtypes';
import { getPlays } from '../../lib/plays';
import { ErrorPage } from '../../components/ErrorPage';

export default requiresAuth(() => {
  const router = useRouter();
  const { pendingPuzzleId } = router.query;
  if (!pendingPuzzleId) {
    return <div />;
  }
  if (Array.isArray(pendingPuzzleId)) {
    return <ErrorPage title="Bad pending puzzle id" />;
  }
  return <PuzzleLoader key={pendingPuzzleId} puzzleId={pendingPuzzleId} />;
});

// We need to export this so we can import it in pending.test.jsx
export const PuzzleLoader = ({ puzzleId }: { puzzleId: string }) => {
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
          if (validationResult.right.p && validationResult.right.p <= TimestampClass.now()) {
            NextJSRouter.push('/crosswords/' + puzzleId);
            return;
          }
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
    </ErrorPage>;
  }
  if (!puzzle) {
    return <div>Loading...</div>;
  }
  return <PlayLoader key={puzzle.id} puzzle={puzzle} />;
};

const PlayLoader = ({ puzzle, nextPuzzle }: { puzzle: PuzzleResult, nextPuzzle?: NextPuzzleLink }) => {
  const { user, isAdmin, loadingUser, error } = useContext(AuthContext);
  const [play, setPlay] = useState<PlayWithoutUserT | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [loadingPlay, setLoadingPlay] = useState(true);

  useEffect(() => {
    setPlay(null);
    setPlayError(null);
    setLoadingPlay(true);

    if (loadingUser || error) {
      return;
    }

    getPlays(user)
      .then(plays => {
        setPlay(plays[puzzle.id] || null);
        setLoadingPlay(false);
      })
      .catch((e) => {
        console.error(e);
        setPlayError(typeof e === 'string' ? e : 'error loading play');
      });
  }, [puzzle, user, loadingUser, error]);

  if (error) {
    return <><p>Error loading user: {error}</p><p>Please refresh the page to try again.</p></>;
  }
  if (playError) {
    return <><p>Error loading play: {playError}</p><p>Please refresh the page to try again.</p></>;
  }

  return <Puzzle key={puzzle.id} puzzle={puzzle} loadingPlayState={loadingUser || loadingPlay} play={play} user={user} isAdmin={isAdmin} nextPuzzle={nextPuzzle} />;
};
