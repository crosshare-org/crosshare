import Error from 'next/error';
import { useState, useEffect, useContext } from 'react';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { AuthContext } from '../../components/AuthContext';
import { puzzleFromDB, PuzzleResult } from '../../lib/types';
import { Puzzle, NextPuzzleLink } from '../../components/Puzzle';
import { App, TimestampClass } from '../../lib/firebaseWrapper';
import { DBPuzzleV, PlayWithoutUserT, PlayWithoutUserV } from '../../lib/dbtypes';
import { getFromSessionOrDB } from '../../lib/dbUtils';


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
    console.log("loaded puzzle from db");
    puzzle = { ...puzzleFromDB(validationResult.right), id: dbres.id };
  } else {
    console.error(PathReporter.report(validationResult).join(","));
    return { props: { puzzle: null } };
  }

  // Get puzzle to show as next link after this one is finished
  const priorTo = (puzzle.category === 'dailymini' && puzzle.publishTime) ?
    TimestampClass.fromMillis(puzzle.publishTime) : TimestampClass.now();
  const prevMini = await db.collection('c').where("c", "==", "dailymini")
    .where("p", "<", priorTo)
    .orderBy("p", "desc").limit(1).get();
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
    console.error(PathReporter.report(validationResult).join(","));
    return { props: { puzzle: puzzle } };
  }
}

export default ({ puzzle, nextPuzzle }: PuzzlePageProps) => {
  if (!puzzle) {
    return <Error statusCode={404} title="No puzzle found" />;
  }
  return <UserLoader key={puzzle.id} puzzle={puzzle} nextPuzzle={nextPuzzle} />
};

const UserLoader = ({ puzzle, nextPuzzle }: { puzzle: PuzzleResult, nextPuzzle?: NextPuzzleLink }) => {
  const { user, isAdmin, loadingUser, error } = useContext(AuthContext);
  if (loadingUser) {
    return <div></div>;
  }
  if (error) {
    return <div>Error loading user: {error}</div>;
  }
  console.log("HERE WE ARE", user);
  if (!user) {
    return <Puzzle key={puzzle.id} puzzle={puzzle} play={null} isAdmin={false} nextPuzzle={nextPuzzle} />
  }
  return <PlayLoader key={puzzle.id} puzzle={puzzle} user={user} isAdmin={isAdmin} nextPuzzle={nextPuzzle} />
}

const PlayLoader = ({ puzzle, user, isAdmin, nextPuzzle }: { puzzle: PuzzleResult, user: firebase.User, isAdmin: boolean, nextPuzzle?: NextPuzzleLink }) => {
  const [play, setPlay] = useState<PlayWithoutUserT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPlay, setIsLoadingPlay] = useState(true);

  useEffect(() => {
    setPlay(null);
    setError(null);
    setIsLoadingPlay(true);

    getFromSessionOrDB({
      collection: 'p',
      docId: puzzle.id + "-" + user.uid,
      localDocId: puzzle.id,
      validator: PlayWithoutUserV,
      ttl: -1
    })
      .then(play => {
        setPlay(play);
        setIsLoadingPlay(false);
      })
      .catch((e) => {
        console.error(e);
        setError(typeof e === 'string' ? e : 'error loading play');
      });
  }, [puzzle, user]);

  if (error) {
    return <div>Something went wrong: {error}</div>
  }

  if (isLoadingPlay) {
    return <div></div>
  }

  return <Puzzle key={puzzle.id} puzzle={puzzle} play={play} user={user} isAdmin={isAdmin} nextPuzzle={nextPuzzle} />
}
