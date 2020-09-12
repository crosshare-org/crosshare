import { useState, useEffect, useContext, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { getDailyMinis } from '../../lib/dailyMinis';
import { AuthContext } from '../../components/AuthContext';
import { puzzleFromDB, ServerPuzzleResult } from '../../lib/types';
import { Puzzle, NextPuzzleLink } from '../../components/Puzzle';
import { App } from '../../lib/firebaseWrapper';
import {
  DBPuzzleV, PlayWithoutUserV, PlayWithoutUserT, getDateString, addZeros, CategoryIndexT
} from '../../lib/dbtypes';
import { getPlayFromCache, cachePlay } from '../../lib/plays';
import { ErrorPage } from '../../components/ErrorPage';
import { Link } from '../../components/Link';
import { userIdToPage } from '../../lib/constructorPage';
import { useDocument } from 'react-firebase-hooks/firestore';

interface PuzzlePageProps {
  puzzle: ServerPuzzleResult | null,
  nextPuzzle?: NextPuzzleLink,
}

export const getServerSideProps: GetServerSideProps<PuzzlePageProps> = async ({ res, params }) => {
  const db = App.firestore();
  let puzzle: ServerPuzzleResult | null = null;
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
    puzzle = { ...puzzleFromDB(validationResult.right), id: dbres.id, constructorPage: await userIdToPage(validationResult.right.a) };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return { props: { puzzle: null } };
  }

  // Get puzzle to show as next link after this one is finished
  let minis: CategoryIndexT;
  try {
    minis = await getDailyMinis();
  } catch {
    return {
      props: {
        puzzle: puzzle
      }
    };
  }
  const puzzleId = puzzle.id;
  const today = getDateString(new Date());
  const miniDate = Object.keys(minis).find(key => minis[key] === puzzleId);
  if (miniDate && (addZeros(miniDate) <= addZeros(today))) {
    const previous = Object.entries(minis)
      .map(([k, v]) => [addZeros(k), v])
      .filter(([k, _v]) => k < addZeros(miniDate))
      .sort((a, b) => a[0] > b[0] ? -1 : 1);
    if (previous.length) {
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
  return <CachePlayLoader key={puzzle.id} puzzle={puzzle} nextPuzzle={nextPuzzle} />;
}

const CachePlayLoader = ({ puzzle, nextPuzzle }: { puzzle: ServerPuzzleResult, nextPuzzle?: NextPuzzleLink }) => {
  const { user, isAdmin, loading, error } = useContext(AuthContext);
  const [play, setPlay] = useState<PlayWithoutUserT | null>(null);
  const [loadingPlay, setLoadingPlay] = useState(true);

  useEffect(() => {
    if (loading || error) {
      return;
    }

    const cachedPlay = getPlayFromCache(user, puzzle.id);
    if (cachedPlay ?.f) {
      setPlay(cachedPlay);
    }
    setLoadingPlay(false);
  }, [puzzle, user, loading, error]);

  if (error) {
    return <><p>Error loading user: {error}</p><p>Please refresh the page to try again.</p></>;
  }
  if (loading || loadingPlay) {
    return <Puzzle key={puzzle.id} puzzle={puzzle} loadingPlayState={true} play={play} user={user} isAdmin={isAdmin} nextPuzzle={nextPuzzle} />;
  }
  if (play || !user || puzzle.authorId === user.uid) {
    return <Puzzle key={puzzle.id} puzzle={puzzle} loadingPlayState={false} play={play} user={user} isAdmin={isAdmin} nextPuzzle={nextPuzzle} />;
  }
  return <DBPlayLoader key={puzzle.id} puzzle={puzzle} user={user} isAdmin={isAdmin} nextPuzzle={nextPuzzle} />;
};

const DBPlayLoader = ({ user, puzzle, isAdmin, nextPuzzle }: { user: firebase.User, isAdmin: boolean, puzzle: ServerPuzzleResult, nextPuzzle?: NextPuzzleLink }) => {
  // Load from db
  const [doc, loading, error] = useDocument(App.firestore().doc(`p/${puzzle.id}-${user.uid}`));
  const [play, playDecodeError] = useMemo(() => {
    if (doc === undefined) {
      return [undefined, undefined];
    }
    if (!doc.exists) {
      return [null, undefined];
    }
    const validationResult = PlayWithoutUserV.decode(doc.data({ serverTimestamps: 'previous' }));
    if (isRight(validationResult)) {
      cachePlay(user, validationResult.right.c, validationResult.right, true);
      return [validationResult.right, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'failed to decode play'];
    }
  }, [doc, user]);

  if (error) {
    return <><p>Error loading user: {error}</p><p>Please refresh the page to try again.</p></>;
  }
  if (playDecodeError) {
    return <><p>Error loading play: {playDecodeError}</p><p>Please refresh the page to try again.</p></>;
  }
  if (loading || play === undefined) {
    return <Puzzle key={puzzle.id} puzzle={puzzle} loadingPlayState={true} play={null} user={user} isAdmin={isAdmin} nextPuzzle={nextPuzzle} />;
  }
  return <Puzzle key={puzzle.id} puzzle={puzzle} loadingPlayState={false} play={play} user={user} isAdmin={isAdmin} nextPuzzle={nextPuzzle} />;
};
