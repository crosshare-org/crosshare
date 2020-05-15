import React from 'react';
import ReactDOM from 'react-dom';
import "./style.css";
import App from './App';
import * as serviceWorker from './serviceWorker';
import * as Sentry from '@sentry/browser';
import { initFirebase } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_SENTRY_RELEASE) {
  Sentry.init({
    dsn: "https://aef749dfcec64668bf922b8fbe4c0b41@o117398.ingest.sentry.io/5192748",
    release: process.env.REACT_APP_SENTRY_RELEASE,
  });
}

declare var firebase: typeof import('firebase');

fetch('/__/firebase/init.json').then(async response => {
  const res = await response.json();
  const firebaseApp = firebase.initializeApp({ ...res, authDomain: "auth.crosshare.org" });
  if (process.env.NODE_ENV === 'production') {
    firebaseApp.performance();
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  function useAuthStateCurried() {
    return useAuthState(firebaseApp.auth());
  }
  if (process.env.REACT_APP_USE_FIREBASE_EMULATOR) {
    var db = firebaseApp.firestore();
    db.settings({
      host: "localhost:8080",
      ssl: false
    });
  }
  initFirebase(firebaseApp, firebase.firestore.Timestamp, provider, firebase.firestore.FieldValue.delete(), useAuthStateCurried);
  ReactDOM.render(<App />, document.getElementById('root'));
});

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
