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
import { getStorageUrl } from '../../lib/serverOnly';

interface ErrorProps {
  error: string
}

interface PuzzlePageProps {
  puzzle: ServerPuzzleResult,
  profilePicture?: string | null,
  nextPuzzle?: NextPuzzleLink,
}

type PageProps = PuzzlePageProps | ErrorProps;


export const getServerSideProps: GetServerSideProps<PageProps> = async ({ res, params }) => {
  const db = App.firestore();
  let puzzle: ServerPuzzleResult | null = null;
  if (!params ?.puzzleId || Array.isArray(params.puzzleId)) {
    return { props: { error: 'bad puzzle params' } };
  }
  let dbres;
  try {
    dbres = await db.collection('c').doc(params.puzzleId).get();
  } catch {
    return { props: { error: 'error getting puzzle' } };
  }
  if (!dbres.exists) {
    return { props: { error: 'puzzle doesnt exist' } };
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (isRight(validationResult)) {
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    puzzle = { ...puzzleFromDB(validationResult.right), id: dbres.id, constructorPage: await userIdToPage(validationResult.right.a) };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return { props: { error: 'invalid puzzle' } };
  }

  let profilePicture: string | null = null;
  if (puzzle.constructorPage ?.u) {
    profilePicture = await getStorageUrl(`users/${puzzle.constructorPage.u}/profile.jpg`);
  }

  // Get puzzle to show as next link after this one is finished
  let minis: CategoryIndexT;
  try {
    minis = await getDailyMinis();
  } catch {
    return {
      props: {
        puzzle, profilePicture
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
          puzzle, profilePicture, nextPuzzle: {
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
      puzzle, profilePicture, nextPuzzle: {
        puzzleId: minis[today],
        linkText: 'today\'s daily mini crossword'
      }
    }
  };
};

export default function PuzzlePage(props: PageProps) {
  if ('error' in props) {
    return <ErrorPage title='Puzzle Not Found'>
      <p>We&apos;re sorry, we couldn&apos;t find the puzzle you requested.</p>
      <p>{props.error}</p>
      <p>Try the <Link href="/" passHref>homepage</Link>.</p>
    </ErrorPage>;
  }
  return <CachePlayLoader key={props.puzzle.id} {...props} />;
}

const CachePlayLoader = (props: PuzzlePageProps) => {
  const { user, isAdmin, loading, error } = useContext(AuthContext);
  const [play, setPlay] = useState<PlayWithoutUserT | null>(null);
  const [loadingPlay, setLoadingPlay] = useState(true);

  useEffect(() => {
    if (loading || error) {
      return;
    }

    const cachedPlay = getPlayFromCache(user, props.puzzle.id);
    if (cachedPlay ?.f || !user) {
      setPlay(cachedPlay || null);
    }
    setLoadingPlay(false);
  }, [props.puzzle, user, loading, error]);

  if (error) {
    return <><p>Error loading user: {error}</p><p>Please refresh the page to try again.</p></>;
  }
  if (loading || loadingPlay) {
    return <Puzzle key={props.puzzle.id} {...props} loadingPlayState={true} play={play} user={user} isAdmin={isAdmin} />;
  }
  if (play || !user || props.puzzle.authorId === user.uid) {
    return <Puzzle key={props.puzzle.id} {...props} loadingPlayState={false} play={play} user={user} isAdmin={isAdmin} />;
  }
  return <DBPlayLoader key={props.puzzle.id} {...props} user={user} isAdmin={isAdmin} />;
};

const DBPlayLoader = (props: { user: firebase.User, isAdmin: boolean } & PuzzlePageProps) => {
  // Load from db
  const [doc, loading, error] = useDocument(App.firestore().doc(`p/${props.puzzle.id}-${props.user.uid}`));
  const [play, playDecodeError] = useMemo(() => {
    if (doc === undefined) {
      return [undefined, undefined];
    }
    if (!doc.exists) {
      return [null, undefined];
    }
    const validationResult = PlayWithoutUserV.decode(doc.data({ serverTimestamps: 'previous' }));
    if (isRight(validationResult)) {
      cachePlay(props.user, validationResult.right.c, validationResult.right, true);
      return [validationResult.right, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'failed to decode play'];
    }
  }, [doc, props.user]);

  if (error) {
    return <><p>Error loading user: {error}</p><p>Please refresh the page to try again.</p></>;
  }
  if (playDecodeError) {
    return <><p>Error loading play: {playDecodeError}</p><p>Please refresh the page to try again.</p></>;
  }
  if (loading || play === undefined) {
    return <Puzzle key={props.puzzle.id} {...props} loadingPlayState={true} play={null} />;
  }
  return <Puzzle key={props.puzzle.id} {...props} loadingPlayState={false} play={play} />;
};
