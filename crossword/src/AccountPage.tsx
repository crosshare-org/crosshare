/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from "@reach/router";

import { AuthContext, requiresAuth } from './App';
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

export const AccountPage = requiresAuth((_: RouteComponentProps) => {
  const {user} = React.useContext(AuthContext);
  if (!user) {
    throw new Error("bad user in context");
  }
  return (
    <Page title="Account">
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid black' }}>Account</h4>
        <p>You're logged in as <b>{user.email}</b>. <button onClick={() => firebase.auth().signOut()}>Log out</button></p>
        <DisplayNameForm user={user}/>
      </div>
    </Page>
  );
});
