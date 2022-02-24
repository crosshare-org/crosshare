// On client side we include firebase via script tags.
// The 'externals' field in package.json tells it not to bundle these.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/storage';
import { firebaseConfig } from '../firebaseConfig';

// Initialize Firebase
export let App: firebase.app.App;

if (firebase.apps.length && firebase.apps[0]) {
  App = firebase.apps[0];
} else {
  App = firebase.initializeApp(firebaseConfig);
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR) {
    const db = App.firestore();
    db.settings({
      host: 'localhost:8080',
      ssl: false,
    });
  }
}

export const setApp = (app: firebase.app.App) => {
  App = app;
};
export const setUpForSignInAnonymously = (
  _app: firebase.app.App,
  _user: firebase.User
) => {
  throw new Error('For testing only');
};

export const signInAnonymously = async () => {
  const userCredential = await firebase.auth().signInAnonymously();
  if (!userCredential.user) {
    throw new Error('Logged in anonymously but no user in result');
  }
  return userCredential.user;
};

export const setUserMap = (_map: Record<string, firebase.User>) => {
  /* noop */
};

export const AuthProvider = new firebase.auth.GoogleAuthProvider();

export const DeleteSentinal = firebase.firestore.FieldValue.delete();

export const ServerTimestamp = firebase.firestore.FieldValue.serverTimestamp();

export const FieldValue = firebase.firestore.FieldValue;

export let TimestampClass = firebase.firestore.Timestamp;
//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setTimestampClass(cls: any) {
  TimestampClass = cls;
}
export type TimestampType = firebase.firestore.Timestamp;
