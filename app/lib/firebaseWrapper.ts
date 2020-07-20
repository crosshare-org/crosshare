// On client side we include firebase via script tags.
// The 'externals' field in package.json tells it not to bundle these.
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/performance';
import 'firebase/auth';
import 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBrmmBf91peVT5T_Z7N3z9oizsPH5u2pUc',
  authDomain: 'auth.crosshare.org',
  databaseURL: 'https://mdcrosshare.firebaseio.com',
  projectId: 'mdcrosshare',
  storageBucket: 'mdcrosshare.appspot.com',
  messagingSenderId: '603173482014',
  appId: '1:603173482014:web:98d7d820731b7c5eaa080f',
  measurementId: 'G-LTLN7Z4XBS'
};

// Initialize Firebase
export let App: firebase.app.App;
if (firebase.apps.length) {
  App = firebase.apps[0];
} else {
  App = firebase.initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'production') {
      try {
        App.performance();
      } catch {
        console.error('failed to load firebase.performance');
      }
    }
  }
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR) {
    const db = App.firestore();
    db.settings({
      host: 'localhost:8080',
      ssl: false
    });
  }
}

export const setApp = (app: firebase.app.App) => { App = app; };

export const setUpForSignInAnonymously = (_app: firebase.app.App, _user: firebase.User) => {
  throw new Error('For testing only');
};

export const signInAnonymously = async () => {
  const userCredential = await firebase.auth().signInAnonymously();
  if (!userCredential.user) {
    throw new Error('Logged in anonymously but no user in result');
  }
  return userCredential.user;
};

export const AuthProvider = new firebase.auth.GoogleAuthProvider();

export const DeleteSentinal = firebase.firestore.FieldValue.delete();

export const ServerTimestamp = firebase.firestore.FieldValue.serverTimestamp();

export let TimestampClass = firebase.firestore.Timestamp;
export function setTimestampClass(cls: any) { //eslint-disable-line @typescript-eslint/no-explicit-any
  TimestampClass = cls;
}
export type TimestampType = firebase.firestore.Timestamp;
