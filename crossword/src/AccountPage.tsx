/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from "@reach/router";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { requiresAuth, AuthProps } from './App';
import { PuzzleResult, PuzzleV } from './types';
import { PuzzleListItem } from './PuzzleList';
import firebase from 'firebase/app';
import 'firebase/auth';

import { Page } from './Page';

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
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    console.log("loading authored Puzzles");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    db.collection('crosswords').where("authorId", "==", user.uid).get().then((value) => {
      let results: Array<PuzzleResult> = [];
      value.forEach(doc => {
        const data = doc.data();
        const validationResult = PuzzleV.decode(data);
        if (isRight(validationResult)) {
          results.push({...validationResult.right, id: doc.id});
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
  }, [error, user]);

  if (error) {
    return <Page title={null}>Error loading authored puzzles</Page>;
  }
  return (
    <Page title="Account">
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid black' }}>Account</h4>
        <p>You're logged in as <b>{user.email}</b>. <button onClick={() => firebase.auth().signOut()}>Log out</button></p>
        <DisplayNameForm user={user}/>
        { authoredPuzzles && authoredPuzzles.length ?
          <React.Fragment>
          <h4 css={{ borderBottom: '1px solid black' }}>Authored Puzzles</h4>
          <ul>{authoredPuzzles.map(PuzzleListItem)}</ul>
          </React.Fragment>
          :
          ""
        }
      </div>
    </Page>
  );
});
