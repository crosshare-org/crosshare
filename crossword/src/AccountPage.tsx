/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { Link, RouteComponentProps } from "@reach/router";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { requiresAuth, AuthProps } from './App';
import { UserPlaysV, AuthoredPuzzlesV } from './common/dbtypes';
import { timeString } from './utils'

import { Page } from './Page';

declare var firebase: typeof import('firebase');

export const PlayListItem = (props: UserPlay) => {
  return (
    <li key={props.id}><Link to={"/crosswords/" + props.id}>{props.title}</Link> {props.didComplete ? "completed " + (props.didCheat ? "with helpers" : "without helpers") : "unfinished"} {timeString(props.playTime)}</li>
  );
}

export const AuthoredListItem = (props: AuthoredPuzzle) => {
  return (
    <li key={props.id}><Link to={"/crosswords/" + props.id}>{props.title}</Link></li>
  );
}

const DisplayNameForm = ({ user }: { user: firebase.User }) => {
  function sanitize(input: string) {
    return input.replace(/[^0-9a-zA-Z ]/g, '');
  }
  const [displayName, setDisplayName] = React.useState(user.displayName || "Anonymous Crossharer");
  const [newDisplayName, setNewDisplayName] = React.useState(sanitize(displayName));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisplayName.trim()) {
      user.updateProfile({ displayName: newDisplayName.trim() }).then(() => {
        if (!user.displayName) {
          throw new Error("something went wrong");
        }
        setDisplayName(user.displayName);
      });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>Your display name - <i>{displayName}</i> - is displayed next to any comments you make or puzzles you create.</p>
      <label>
        Update display name:
        <input css={{ margin: '0 0.5em', }} type="text" value={newDisplayName} onChange={e => setNewDisplayName(sanitize(e.target.value))} />
      </label>
      <input type="submit" value="Submit" />
    </form>
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

export const AccountPage = requiresAuth(({ user }: RouteComponentProps & AuthProps) => {
  const [authoredPuzzles, setAuthoredPuzzles] = React.useState<Array<AuthoredPuzzle> | null>(null);
  const [plays, setPlays] = React.useState<Array<UserPlay> | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    console.log("loading authored puzzles and plays");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    // TODO pagination on both of these
    db.collection('uc').doc(user.uid).get().then((value) => {
      if (!value.exists) {
        setAuthoredPuzzles([]);
        return;
      }
      const validationResult = AuthoredPuzzlesV.decode(value.data());
      if (isRight(validationResult)) {
        const authored = Object.entries(validationResult.right).map(([id, val]) => {
          const [createdAt, title] = val;
          return { id, createdAt, title };
        })
        // Sort in reverse order by createdAt
        authored.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setAuthoredPuzzles(authored);
      } else {
        console.error(PathReporter.report(validationResult).join(","));
        setError(true);
      }
    }).catch(reason => {
      console.error(reason);
      setError(true);
    });
    db.collection('up').doc(user.uid).get().then((value) => {
      if (!value.exists) {
        setPlays([]);
        return;
      }
      const validationResult = UserPlaysV.decode(value.data());
      if (isRight(validationResult)) {
        const plays = Object.entries(validationResult.right).map(([id, val]) => {
          const [updatedAt, playTime, didCheat, didComplete, title] = val;
          return { id, updatedAt, playTime, didCheat, didComplete, title };
        })
        // Sort in reverse order by updatedAt
        plays.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
        setPlays(plays);

      } else {
        console.error(PathReporter.report(validationResult).join(","));
        setError(true);
      }
    }).catch(reason => {
      console.error(reason);
      setError(true);
    });
  }, [error, user]);

  if (error) {
    return <Page title={null}>Error loading plays / authored puzzles</Page>;
  }
  return (
    <Page title="Account">
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Account</h4>
        <p>You're logged in as <b>{user.email}</b>. <button onClick={() => firebase.auth().signOut()}>Log out</button></p>
        <DisplayNameForm user={user} />
        {plays && plays.length ?
          <React.Fragment>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>Recent Plays</h4>
            <ul>{plays.map(PlayListItem)}</ul>
          </React.Fragment>
          :
          ""
        }
        {authoredPuzzles && authoredPuzzles.length ?
          <React.Fragment>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>Authored Puzzles</h4>
            <ul>{authoredPuzzles.map(AuthoredListItem)}</ul>
          </React.Fragment>
          :
          ""
        }
      </div>
    </Page>
  );
});
