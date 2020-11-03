const firebaseTesting = jest.requireActual('@firebase/rules-unit-testing');
import firebaseAdmin from 'firebase-admin';
import type firebase from 'firebase/app';

export let App: firebase.app.App;
export let AdminApp: firebaseAdmin.app.App;

export const setApp = (app: firebase.app.App) => {
  App = app;
};
export const setAdminApp = (app: firebaseAdmin.app.App) => {
  AdminApp = app;
};
let userMap: Record<string, firebase.User> = {};
export const setUserMap = (_map: Record<string, firebase.User>) => {
  userMap = _map;
};
export const getUser = (userId: string) => userMap[userId];

export const AuthProvider = null;

export const DeleteSentinal = firebaseTesting.firestore.FieldValue.delete();

export const ServerTimestamp = firebaseTesting.firestore.FieldValue.serverTimestamp();

export const TimestampClass = firebaseTesting.firestore.Timestamp;
export const AdminTimestamp = firebaseAdmin.firestore.Timestamp;
export const FieldValue = firebaseTesting.firestore.FieldValue;

let anonApp: firebase.app.App;
let anonUser: firebase.User;
export const setUpForSignInAnonymously = (
  app: firebase.app.App,
  user: firebase.User
) => {
  anonApp = app;
  anonUser = user;
};

export const signInAnonymously = async () => {
  setApp(anonApp);
  return anonUser;
};
