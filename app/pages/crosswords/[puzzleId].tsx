import { useState, useEffect, useContext } from 'react';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { getDailyMinis } from '../../lib/dailyMinis';
import { AuthContext } from '../../components/AuthContext';
import { puzzleFromDB, PuzzleResult } from '../../lib/types';
import { Puzzle, NextPuzzleLink } from '../../components/Puzzle';
import { App } from '../../lib/firebaseWrapper';
import { DBPuzzleV, PlayWithoutUserT, getDateString, addZeros } from '../../lib/dbtypes';
import { getPlays } from '../../lib/plays';
import { ErrorPage } from '../../components/ErrorPage';
import { Link } from '../../components/Link';

interface PuzzlePageProps {
  puzzle: PuzzleResult | null,
  nextPuzzle?: NextPuzzleLink,
}

export const getServerSideProps: GetServerSideProps<PuzzlePageProps> = async ({ res, params }) => {
  const db = App.firestore();
  let puzzle: PuzzleResult | null = null;
  if (!params ?.puzzleId || Array.isArray(params.puzzleId)) {
    console.error('bad puzzle params');
    return { props: { puzzle: null } };
  }
  let dbres;
  try {
    dbres = await db.collection('c').doc(params.puzzleId).get();
  } catch {
    return { props: { puzzle: null } };
  }
  if (!dbres.exists) {
    return { props: { puzzle: null } };
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (isRight(validationResult)) {
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    puzzle = { ...puzzleFromDB(validationResult.right), id: dbres.id };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return { props: { puzzle: null } };
  }

  // Get puzzle to show as next link after this one is finished
  const minis = await getDailyMinis();
  const puzzleId = puzzle.id;
  const miniDate = Object.keys(minis).find(key => minis[key] === puzzleId);
  if (miniDate) {
    const previous = Object.entries(minis)
      .map(([k, v]) => [addZeros(k), v])
      .filter(([k, _v]) => k < addZeros(miniDate))
      .sort((a, b) => a[0] > b[0] ? -1 : 1);
    if (previous) {
      return {
        props: {
          puzzle: puzzle, nextPuzzle: {
            puzzleId: previous[0][1],
            linkText: 'the previous daily mini crossword'
          }
        }
      };
    }
  }

  // Didn't find a previous mini, link to today's
  const today = getDateString(new Date());
  return {
    props: {
      puzzle: puzzle, nextPuzzle: {
        puzzleId: minis[today],
        linkText: 'today\'s daily mini crossword'
      }
    }
  };
};

export default function PuzzlePage({ puzzle, nextPuzzle }: PuzzlePageProps) {
  if (!puzzle) {
    return <ErrorPage title='Puzzle Not Found'>
      <p>We&apos;re sorry, we couldn&apos;t find the puzzle you requested.</p>
      <p>Try the <Link href="/" passHref>homepage</Link>.</p>
    </ErrorPage>;
  }
  return <PlayLoader key={puzzle.id} puzzle={puzzle} nextPuzzle={nextPuzzle} />;
}

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
