import Error from 'next/error';
import { useState, useEffect, useContext } from 'react';
import { GetStaticProps, GetStaticPaths } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { AuthContext } from '../../components/AuthContext';
import { puzzleFromDB, PuzzleResult } from '../../lib/types';
import { Puzzle } from '../../components/Puzzle';
import { App } from '../../lib/firebase';
import { DBPuzzleV, PlayT, PlayV } from '../../lib/dbtypes';
import { getFromSessionOrDB } from '../../lib/dbUtils';

export const getStaticPaths: GetStaticPaths = async () => {
  // by returning an empty list, we are forcing each page to be rendered on request.
  // these pages will only be rendered once on first request.
  // the resultant .html and .json will be cached by the CDN indefinitely, with the following cache headers
  // cache-control: public,max-age=31536000,immutable

  // firebase hosting deployment should invalidate these cached values
  // additionally, a new `next build` will create a new Build ID which is
  // used in the path for the returned .json data file.
  return {
    paths: [],
    fallback: true,
  };
}

interface PuzzlePageProps {
  puzzle: PuzzleResult | null
}

export const getStaticProps: GetStaticProps<PuzzlePageProps> = async (context) => {
  const db = App.firestore();
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
    console.log("loaded, and caching in storage");
    return { props: { puzzle: { ...puzzleFromDB(validationResult.right), id: dbres.id } } }
  } else {
    console.error(PathReporter.report(validationResult).join(","));
    return { props: { puzzle: null } };
  }
}

const PuzzlePage = ({ puzzle }: PuzzlePageProps) => {
  if (!puzzle) {
    return <Error statusCode={404} title="No puzzle found" />;
  }
  return <UserLoader puzzle={puzzle} />
};
export default PuzzlePage;

const UserLoader = ({ puzzle }: { puzzle: PuzzleResult }) => {
  const { user, isAdmin, loadingUser, error } = useContext(AuthContext);
  if (loadingUser) {
    return <div></div>;
  }
  if (error) {
    return <div>Error loading user: {error}</div>;
  }
  if (!user) {
    return <Puzzle key={puzzle.id} puzzle={puzzle} play={null} user={null} isAdmin={false} />
  }
  return <PlayLoader puzzle={puzzle} user={user} isAdmin={isAdmin} />
}

const PlayLoader = ({ puzzle, user, isAdmin }: { puzzle: PuzzleResult, user: firebase.User, isAdmin: boolean }) => {
  const [play, setPlay] = useState<PlayT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPlay, setIsLoadingPlay] = useState(true);

  useEffect(() => {
    setPlay(null);
    setError(null);
    setIsLoadingPlay(true);

    getFromSessionOrDB('p', puzzle.id + "-" + user.uid, PlayV, -1)
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

  return <Puzzle key={puzzle.id} puzzle={puzzle} play={play} user={user} isAdmin={isAdmin} />
}
