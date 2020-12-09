import { useState, useEffect, useContext, useMemo } from 'react';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import type firebase from 'firebase/app';
import { AuthContext } from './AuthContext';
import { Puzzle } from './Puzzle';
import { App } from '../lib/firebaseWrapper';
import { PlayWithoutUserV, PlayWithoutUserT } from '../lib/dbtypes';
import { getPlayFromCache, cachePlay } from '../lib/plays';
import { ErrorPage } from './ErrorPage';
import { Link } from './Link';
import { useDocument } from 'react-firebase-hooks/firestore';
import { PuzzlePageProps, PuzzlePageResultProps } from '../lib/serverOnly';

export function PuzzlePage(props: PuzzlePageProps) {
  if ('error' in props) {
    return (
      <ErrorPage title="Puzzle Not Found">
        <p>We&apos;re sorry, we couldn&apos;t find the puzzle you requested.</p>
        <p>{props.error}</p>
        <p>
          Try the{' '}
          <Link href="/" passHref>
            homepage
          </Link>
          .
        </p>
      </ErrorPage>
    );
  }
  return <CachePlayLoader key={props.puzzle.id} {...props} />;
}

const CachePlayLoader = (props: PuzzlePageResultProps) => {
  const { user, isAdmin, loading, error } = useContext(AuthContext);
  const [play, setPlay] = useState<PlayWithoutUserT | null>(null);
  const [loadingPlay, setLoadingPlay] = useState(true);

  useEffect(() => {
    if (loading || error) {
      return;
    }

    const cachedPlay = getPlayFromCache(user, props.puzzle.id);
    if (cachedPlay?.f || !user) {
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
        user={user}
        isAdmin={isAdmin}
      />
    );
  }
  if (play || !user || props.puzzle.authorId === user.uid) {
    return (
      <Puzzle
        key={props.puzzle.id}
        {...props}
        loadingPlayState={false}
        play={play}
        user={user}
        isAdmin={isAdmin}
      />
    );
  }
  return (
    <DBPlayLoader
      key={props.puzzle.id}
      {...props}
      user={user}
      isAdmin={isAdmin}
    />
  );
};

const DBPlayLoader = (
  props: { user: firebase.User; isAdmin: boolean } & PuzzlePageResultProps
) => {
  // Load from db
  const [doc, loading, error] = useDocument(
    App.firestore().doc(`p/${props.puzzle.id}-${props.user.uid}`)
  );
  const [play, playDecodeError] = useMemo(() => {
    if (doc === undefined) {
      return [undefined, undefined];
    }
    if (!doc.exists) {
      return [null, undefined];
    }
    const validationResult = PlayWithoutUserV.decode(
      doc.data({ serverTimestamps: 'previous' })
    );
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
        <p>Error loading user: {error}</p>
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
        key={props.puzzle.id}
        {...props}
        loadingPlayState={true}
        play={null}
      />
    );
  }
  return (
    <Puzzle
      key={props.puzzle.id}
      {...props}
      loadingPlayState={false}
      play={play}
    />
  );
};
