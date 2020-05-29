import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { getDisplayName, DisplayNameForm } from '../components/DisplayNameForm';
import { requiresAuth, AuthProps } from '../components/AuthContext';
import { UserPlaysV, AuthoredPuzzlesV } from '../lib/dbtypes';
import { getFromSessionOrDB } from '../lib/dbUtils';
import { timeString } from '../lib/utils';
import { App } from '../lib/firebaseWrapper';
import { TopBar } from '../components/TopBar';

export const PlayListItem = (props: UserPlay) => {
  return (
    <li key={props.id}><Link href='/crosswords/[puzzleId]' as={`/crosswords/${props.id}`} passHref><a>{props.title}</a></Link> {props.didComplete ? 'completed ' + (props.didCheat ? 'with helpers' : 'without helpers') : 'unfinished'} {timeString(props.playTime, false)}</li>
  );
};

export const AuthoredListItem = (props: AuthoredPuzzle) => {
  return (
    <li key={props.id}><Link href='/crosswords/[puzzleId]' as={`/crosswords/${props.id}`} passHref><a>{props.title}</a></Link></li>
  );
};

interface AuthoredPuzzle {
  id: string,
  createdAt: firebase.firestore.Timestamp,
  title: string,
}

interface UserPlay {
  id: string,
  updatedAt: firebase.firestore.Timestamp,
  playTime: number,
  didCheat: boolean,
  didComplete: boolean,
  title: string,
}

export default requiresAuth(({ user }: AuthProps) => {
  const [authoredPuzzles, setAuthoredPuzzles] = useState<Array<AuthoredPuzzle> | null>(null);
  const [plays, setPlays] = useState<Array<UserPlay> | null>(null);
  const [error, setError] = useState(false);
  const [displayName, setDisplayName] = useState(getDisplayName(user));

  useEffect(() => {
    console.log('loading authored puzzles and plays');
    // TODO pagination on both of these
    Promise.all([
      getFromSessionOrDB({ collection: 'uc', docId: user.uid, validator: AuthoredPuzzlesV, ttl: -1 }),
      getFromSessionOrDB({ collection: 'up', docId: user.uid, localDocId: '', validator: UserPlaysV, ttl: -1 })
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
          const plays = Object.entries(playsResult).map(([id, val]) => {
            const [updatedAt, playTime, didCheat, didComplete, title] = val;
            return { id, updatedAt, playTime, didCheat, didComplete, title };
          });
          // Sort in reverse order by updatedAt
          plays.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
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
      <TopBar />
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Account</h4>
        <p>You're logged in as <b>{user.email}</b>. <button onClick={() => App.auth().signOut()}>Log out</button></p>
        <p>Your display name - <i>{displayName}</i> - is displayed next to any comments you make or puzzles you create.</p>
        <DisplayNameForm user={user} onChange={setDisplayName} />
        {plays && plays.length ?
          <>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>Recent Plays</h4>
            <ul>{plays.map(PlayListItem)}</ul>
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
