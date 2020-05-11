import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import type firebaseTypes from 'firebase';
import * as firebase from '@firebase/testing';
import { initFirebase } from './firebase';

var app = firebase.initializeTestApp({
  projectId: "mdcrosshare",
  auth: { uid: "alice", admin: true }
});

var db = app.firestore();
db.settings({
  host: "localhost:8080",
  ssl: false
});

function useAuthState(): [firebaseTypes.User | undefined, boolean, firebaseTypes.auth.Error | undefined] {
  return [undefined, false, undefined];
}

initFirebase(app, firebase.firestore.Timestamp, null, firebase.firestore.FieldValue.delete(), useAuthState);

test('renders todays mini link', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/today's daily mini crossword/i);
  expect(linkElement).toBeInTheDocument();
});
