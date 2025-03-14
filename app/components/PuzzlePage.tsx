import type { User } from 'firebase/auth';
import { useRouter } from 'next/router.js';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { PlayWithoutUserT, PlayWithoutUserV } from '../lib/dbtypes.js';
import { getDocRef } from '../lib/firebaseWrapper.js';
import { PathReporter } from '../lib/pathReporter.js';
import { cachePlay, getPlayFromCache } from '../lib/plays.js';
import { AccountPrefsT } from '../lib/prefs.js';
import { PuzzlePageProps, PuzzlePageResultProps } from '../lib/serverOnly.js';
import { isMetaSolution } from '../lib/utils.js';
import { AuthContext } from './AuthContext.js';
import { AuthProps, requiresAuth } from './AuthHelpers.js';
import { ErrorPage } from './ErrorPage.js';
import { Link } from './Link.js';
import { Puzzle } from './Puzzle.js';

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
  if ('packId' in props) {
    return <AddAuthToken key={props.packId} />;
  }
  return <CachePlayLoader key={props.puzzle.id} {...props} />;
}

const AddAuthToken = requiresAuth(({ user }: AuthProps) => {
  const router = useRouter();
  useEffect(() => {
    async function redirect() {
      await router.replace({
        query: { ...router.query, token: await user.getIdToken() },
      });
    }
    void redirect();
  }, [router, user]);
  return <div></div>;
});

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
    const done = props.puzzle.isContest
      ? cachedPlay?.f &&
        (cachedPlay.ct_rv ||
          isMetaSolution(
            cachedPlay.ct_sub,
            props.puzzle.contestAnswers,
            props.puzzle.contestAnswerDigests,
            props.puzzle.id
          ))
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
    if (validationResult._tag === 'Right') {
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
