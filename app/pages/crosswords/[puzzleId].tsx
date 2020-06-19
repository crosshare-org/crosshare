import { useState, useEffect, useContext } from 'react';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { AuthContext } from '../../components/AuthContext';
import { puzzleFromDB, PuzzleResult } from '../../lib/types';
import { Puzzle, NextPuzzleLink } from '../../components/Puzzle';
import { App, TimestampClass } from '../../lib/firebaseWrapper';
import { DBPuzzleV, PlayWithoutUserT } from '../../lib/dbtypes';
import { getPlays } from '../../lib/plays';
import { ErrorPage } from '../../components/ErrorPage';
import { Link } from '../../components/Link';

interface PuzzlePageProps {
  puzzle: PuzzleResult | null,
  nextPuzzle?: NextPuzzleLink,
}

export const getServerSideProps: GetServerSideProps<PuzzlePageProps> = async (context) => {
  const db = App.firestore();
  let puzzle: PuzzleResult | null = null;
  if (!context.params ?.puzzleId || Array.isArray(context.params.puzzleId)) {
    console.error('bad puzzle params');
    return { props: { puzzle: null } };
  }
  const dbres = await db.collection('c').doc(context.params.puzzleId).get();
  if (!dbres.exists) {
    return { props: { puzzle: null } };
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (isRight(validationResult)) {
    console.log('loaded puzzle from db');
    puzzle = { ...puzzleFromDB(validationResult.right), id: dbres.id };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return { props: { puzzle: null } };
  }

  // Get puzzle to show as next link after this one is finished
  const priorTo = (puzzle.category === 'dailymini' && puzzle.publishTime) ?
    TimestampClass.fromMillis(puzzle.publishTime) : TimestampClass.now();
  const prevMini = await db.collection('c').where('c', '==', 'dailymini')
    .where('p', '<', priorTo)
    .orderBy('p', 'desc').limit(1).get();
  if (prevMini.size === 0) {
    return { props: { puzzle: puzzle } };
  }
  const data = prevMini.docs[0].data();
  const vr = DBPuzzleV.decode(data);
  if (isRight(vr)) {
    const linkText = puzzle.category === 'dailymini' ?
      'the previous daily mini crossword' :
      'today\'s daily mini crossword';
    return { props: { puzzle: puzzle, nextPuzzle: { puzzleId: prevMini.docs[0].id, linkText } } };
  } else {
    console.error('Error loading previous mini to show');
    console.error(PathReporter.report(validationResult).join(','));
    return { props: { puzzle: puzzle } };
  }
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
