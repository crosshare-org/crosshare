import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import type { User } from 'firebase/auth';
import { AuthContext } from './AuthContext';
import { Puzzle } from './Puzzle';
import { getDocRef } from '../lib/firebaseWrapper';
import { PlayWithoutUserV, PlayWithoutUserT } from '../lib/dbtypes';
import { getPlayFromCache, cachePlay } from '../lib/plays';
import { ErrorPage } from './ErrorPage';
import { Link } from './Link';
import { useDocument } from 'react-firebase-hooks/firestore';
import { PuzzlePageProps, PuzzlePageResultProps } from '../lib/serverOnly';
import { AccountPrefsT } from '../lib/prefs';
import { isMetaSolution } from '../lib/utils';

export function PuzzlePage(props: PuzzlePageProps) {
  if ('error' in props) {
    return (
      <ErrorPage title="Puzzle Not Found">
        <p>We&apos;re sorry, we couldn&apos;t find the puzzle you requested.</p>
        <p>{props.error}</p>
        <p>
          Try the <Link href="/">homepage</Link>.
        </p>
      </ErrorPage>
    );
  }
  return <CachePlayLoader key={props.puzzle.id} {...props} />;
}

const CachePlayLoader = (props: PuzzlePageResultProps) => {
  const { user, isAdmin, prefs, loading, error } = useContext(AuthContext);
  const [play, setPlay] = useState<PlayWithoutUserT | null>(null);
  const [loadingPlay, setLoadingPlay] = useState(true);
  const [showedNonDB, setShowedNonDB] = useState(false);
  const [userId, setUserId] = useState('');

  // If we loaded w/ one user and now switched to another reset all state
  useEffect(() => {
    if (user && userId !== user.uid) {
      setPlay(null);
      setLoadingPlay(true);
      setShowedNonDB(false);
      setUserId(user.uid);
    }
  }, [user, userId]);

  useEffect(() => {
    if (loading || error) {
      return;
    }

    const cachedPlay = getPlayFromCache(user, props.puzzle.id);
    // Contest puzzles aren't done until they have a finished grid
    // AND a correct submission or a reveal
    const done = props.puzzle.contestAnswers?.length
      ? cachedPlay?.f &&
        (cachedPlay.ct_rv ||
          isMetaSolution(cachedPlay.ct_sub, props.puzzle.contestAnswers))
      : cachedPlay?.f;
    if (done || !user || props.puzzle.authorId === user.uid) {
      console.log('using cached play');
      setPlay(cachedPlay || null);
    }
    setLoadingPlay(false);
  }, [props.puzzle, user, loading, error]);

  if (error) {
    return (
      <>
        <p>Error loading user: {error}</p>
        <p>Please refresh the page to try again.</p>
      </>
    );
  }
  if (loading || loadingPlay) {
    return (
      <Puzzle
        key={props.puzzle.id}
        {...props}
        loadingPlayState={true}
        play={play}
        prefs={prefs}
        user={user}
        isAdmin={isAdmin}
      />
    );
  }
  if (showedNonDB || play || !user || props.puzzle.authorId === user.uid) {
    if (!showedNonDB) {
      setShowedNonDB(true);
    }
    return (
      <Puzzle
        key={props.puzzle.id}
        {...props}
        loadingPlayState={false}
        play={play}
        prefs={prefs}
        user={user}
        isAdmin={isAdmin}
      />
    );
  }
  return (
    <DBPlayLoader
      key={`${props.puzzle.id}-${user.uid}`}
      {...props}
      user={user}
      prefs={prefs}
      isAdmin={isAdmin}
    />
  );
};

const DBPlayLoader = (
  props: {
    user: User;
    isAdmin: boolean;
    prefs?: AccountPrefsT;
  } & PuzzlePageResultProps
) => {
  // Load from db
  const playRef = useRef(
    getDocRef('p', `${props.puzzle.id}-${props.user.uid}`)
  );
  const [doc, loading, error] = useDocument(playRef.current);
  const [play, playDecodeError] = useMemo(() => {
    if (doc === undefined) {
      return [undefined, undefined];
    }
    if (!doc.exists()) {
      return [null, undefined];
    }
    const validationResult = PlayWithoutUserV.decode(doc.data());
    if (isRight(validationResult)) {
      cachePlay(
        props.user,
        validationResult.right.c,
        validationResult.right,
        true
      );
      return [validationResult.right, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'failed to decode play'];
    }
  }, [doc, props.user]);

  if (error) {
    return (
      <>
        <p>Error loading user: {error.message}</p>
        <p>Please refresh the page to try again.</p>
      </>
    );
  }
  if (playDecodeError) {
    return (
      <>
        <p>Error loading play: {playDecodeError}</p>
        <p>Please refresh the page to try again.</p>
      </>
    );
  }
  if (loading || play === undefined) {
    return (
      <Puzzle
        key={`${props.puzzle.id}-${props.user.uid}`}
        {...props}
        loadingPlayState={true}
        play={null}
      />
    );
  }
  return (
    <Puzzle
      key={`${props.puzzle.id}-${props.user.uid}`}
      {...props}
      loadingPlayState={false}
      play={play}
    />
  );
};
