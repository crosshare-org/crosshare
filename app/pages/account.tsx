import { useState, useEffect } from 'react';
import Head from 'next/head';

import { Link } from '../components/Link';
import { getDisplayName, DisplayNameForm } from '../components/DisplayNameForm';
import { requiresAuth, AuthProps } from '../components/AuthContext';
import { AuthoredPuzzlesV, PlayWithoutUserT } from '../lib/dbtypes';
import { getFromSessionOrDB } from '../lib/dbUtils';
import { timeString } from '../lib/utils';
import { App } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import { getPlays } from '../lib/plays';

export const PlayListItem = ({ play, authoredPuzzles }: { play: PlayWithoutUserT, authoredPuzzles: Array<AuthoredPuzzle> | null }) => {
  if (authoredPuzzles && authoredPuzzles.find(ap => ap.id === play.c)) {
    // TODO We need to use /pending/ here since we don't know if the puzzle has
    // been published yet or not
    return (
      <li><Link href='/pending/[puzzleId]' as={`/pending/${play.c}`} passHref>{play.n}</Link> {play.f ? 'completed ' + (play.ch ? 'with helpers' : 'without helpers') : 'unfinished'} {timeString(play.t, false)}</li>
    );
  }
  return (
    <li><Link href='/crosswords/[puzzleId]' as={`/crosswords/${play.c}`} passHref>{play.n}</Link> {play.f ? 'completed ' + (play.ch ? 'with helpers' : 'without helpers') : 'unfinished'} {timeString(play.t, false)}</li>
  );
};

export const AuthoredListItem = (props: AuthoredPuzzle) => {
  // TODO We need to use /pending/ here since we don't know if a play is for a puzzle
  // that hasn't been published yet. Any better way to do this?
  return (
    <li key={props.id}><Link href='/pending/[puzzleId]' as={`/pending/${props.id}`} passHref>{props.title}</Link></li>
  );
};

interface AuthoredPuzzle {
  id: string,
  createdAt: firebase.firestore.Timestamp,
  title: string,
}

export default requiresAuth(({ user }: AuthProps) => {
  const [authoredPuzzles, setAuthoredPuzzles] = useState<Array<AuthoredPuzzle> | null>(null);
  const [plays, setPlays] = useState<Array<PlayWithoutUserT> | null>(null);
  const [error, setError] = useState(false);
  const [displayName, setDisplayName] = useState(getDisplayName(user));

  useEffect(() => {
    console.log('loading authored puzzles and plays');
    // TODO pagination on both of these
    Promise.all([
      getFromSessionOrDB({ collection: 'uc', docId: user.uid, validator: AuthoredPuzzlesV, ttl: -1 }),
      getPlays(user)
    ])
      .then(([authoredResult, playsResult]) => {
        if (authoredResult === null) {
          setAuthoredPuzzles([]);
        } else {
          const authored = Object.entries(authoredResult).map(([id, val]) => {
            const [createdAt, title] = val;
            return { id, createdAt, title };
          });
          // Sort in reverse order by createdAt
          authored.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          setAuthoredPuzzles(authored);
        }
        if (playsResult === null) {
          setPlays([]);
        } else {
          const plays = Object.values(playsResult);
          // Sort in reverse order by updatedAt
          plays.sort((a, b) => b.ua.toMillis() - a.ua.toMillis());
          setPlays(plays);
        }
      }).catch(reason => {
        console.error(reason);
        setError(true);
      });
  }, [user]);

  if (error) {
    return <div>Error loading plays / authored puzzles</div>;
  }
  return (
    <>
      <Head>
        <title>Account | Crosshare</title>
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Account</h4>
        <p>You&apos;re logged in as <b>{user.email}</b>. <button onClick={() => App.auth().signOut()}>Log out</button></p>
        <p>Your display name - <i>{displayName}</i> - is displayed next to any comments you make or puzzles you create.</p>
        <DisplayNameForm user={user} onChange={setDisplayName} />
        {plays && plays.length ?
          <>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>Recent Plays</h4>
            <ul>{plays.map((play) => <PlayListItem key={play.c} play={play} authoredPuzzles={authoredPuzzles} />)}</ul>
          </>
          :
          ''
        }
        {authoredPuzzles && authoredPuzzles.length ?
          <>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>Authored Puzzles</h4>
            <ul>{authoredPuzzles.map(AuthoredListItem)}</ul>
          </>
          :
          ''
        }
      </div>
    </>
  );
});
