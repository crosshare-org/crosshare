/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { Link, RouteComponentProps } from "@reach/router";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { requiresAuth, AuthProps } from './App';
import { PuzzleResult, DBPuzzleV, puzzleFromDB, PlayT, PlayV } from './types';
import { PuzzleListItem } from './PuzzleList';
import { timeString } from './utils'

import { Page } from './Page';

declare var firebase: typeof import('firebase');

export const PlayListItem = (props: PlayT) => {
  return (
    <li key={props.c}><Link to={"/crosswords/" + props.c}>{props.n}</Link> { props.f ? "completed " + (props.ch ? "with helpers" : "without helpers") : "unfinished"} {timeString(props.t)}</li>
  );
}

const DisplayNameForm = ({user}: {user: firebase.User}) => {
  function sanitize(input:string) {
    return input.replace(/[^0-9a-zA-Z ]/g, '');
  }
  const [displayName, setDisplayName] = React.useState(user.displayName || "Anonymous Crossharer");
  const [newDisplayName, setNewDisplayName] = React.useState(sanitize(displayName));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisplayName.trim()) {
      user.updateProfile({displayName: newDisplayName.trim()}).then(() => {
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
        <input css={{margin: '0 0.5em',}} type="text" value={newDisplayName} onChange={e => setNewDisplayName(sanitize(e.target.value))}/>
      </label>
      <input type="submit" value="Submit" />
    </form>
  );
};

export const AccountPage = requiresAuth(({user}: RouteComponentProps & AuthProps) => {
  const [authoredPuzzles, setAuthoredPuzzles] = React.useState<Array<PuzzleResult>|null>(null);
  const [plays, setPlays] = React.useState<Array<PlayT>|null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    console.log("loading authored puzzles and plays");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    // TODO pagination on both of these
    db.collection('c').where("a", "==", user.uid).get().then((value) => {
      let results: Array<PuzzleResult> = [];
      value.forEach(doc => {
        const data = doc.data();
        const validationResult = DBPuzzleV.decode(data);
        if (isRight(validationResult)) {
          results.push({...puzzleFromDB(validationResult.right), id: doc.id});
        } else {
          console.error(PathReporter.report(validationResult).join(","));
          setError(true);
        }
      });
      setAuthoredPuzzles(results);
    }).catch(reason => {
      console.error(reason);
      setError(true);
    });
    db.collection('p').where("u", "==", user.uid).orderBy("ua", "desc").limit(10).get().then((value) => {
      let results: Array<PlayT> = [];
      value.forEach(doc => {
        const data = doc.data();
        const validationResult = PlayV.decode(data);
        if (isRight(validationResult)) {
          const play = validationResult.right;
          results.push(play);
          const key = "p/" + play.c + "-" + play.u;
          if (localStorage.getItem(key) === null) {
            console.log("Caching play in local storage for " + play.n);
            localStorage.setItem(key, JSON.stringify(play));
          }
        } else {
          console.error(PathReporter.report(validationResult).join(","));
          setError(true);
        }
      });
      setPlays(results);
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
        <DisplayNameForm user={user}/>
        { plays && plays.length ?
          <React.Fragment>
          <h4 css={{ borderBottom: '1px solid var(--black)' }}>Recent Plays</h4>
          <ul>{plays.map(PlayListItem)}</ul>
          </React.Fragment>
          :
          ""
        }
        { authoredPuzzles && authoredPuzzles.length ?
          <React.Fragment>
          <h4 css={{ borderBottom: '1px solid var(--black)' }}>Authored Puzzles</h4>
          <ul>{authoredPuzzles.map(PuzzleListItem)}</ul>
          </React.Fragment>
          :
          ""
        }
      </div>
    </Page>
  );
});
