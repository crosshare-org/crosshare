const firebaseTesting = jest.requireActual('@firebase/testing');
import type firebaseAdminType from 'firebase-admin';

export let App: firebase.app.App;
export let AdminApp: firebaseAdminType.app.App;

export const setApp = (app: firebase.app.App) => { App = app; };
export const setAdminApp = (app: firebaseAdminType.app.App) => { AdminApp = app; };

export const AuthProvider = null;

export const DeleteSentinal = firebaseTesting.firestore.FieldValue.delete();

export const ServerTimestamp = firebaseTesting.firestore.FieldValue.serverTimestamp();

export const TimestampClass = firebaseTesting.firestore.Timestamp;
export const AdminTimestamp = firebaseTesting.firestore.Timestamp;

let anonApp: firebase.app.App;
let anonUser: firebase.User;
export const setUpForSignInAnonymously = (app: firebase.app.App, user: firebase.User) => {
  anonApp = app;
  anonUser = user;
};

export const signInAnonymously = async () => {
  setApp(anonApp);
  return anonUser;
};
