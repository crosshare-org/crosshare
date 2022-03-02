import * as t from 'io-ts';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/storage';
import { firebaseConfig } from '../firebaseConfig';
import { getStorage as gS } from 'firebase/storage';
import { getAuth as gA, signInAnonymously as sIA } from 'firebase/auth';
import {
  collection,
  doc,
  DocumentData,
  getFirestore,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp as FBTimestamp,
} from 'firebase/firestore';
import cloneDeepWith from 'lodash/cloneDeepWith';
import { isTimestamp } from './timestamp';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

// Initialize Firebase
let App: firebase.app.App;

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

export const getDocId = (collection: string) =>
  doc(getFirestore(App), collection).id;

export const getAuth = () => gA(App);
export const getStorage = () => gS(App);

export const getCollection = (collectionName: string) =>
  collection(getFirestore(App), collectionName).withConverter({
    toFirestore: (data: any) =>
      cloneDeepWith(data, (val) => {
        if (isTimestamp(val)) {
          return FBTimestamp.fromMillis(val.toMillis());
        }
        return undefined;
      }),
    fromFirestore: (s: any) => s,
  });

export function getValidatedCollection<V>(
  collectionName: string,
  validator: t.Decoder<unknown, V>,
  idField: string | null = null
) {
  return collection(getFirestore(App), collectionName).withConverter({
    toFirestore: (data: any) =>
      cloneDeepWith(data, (val) => {
        if (isTimestamp(val)) {
          return FBTimestamp.fromMillis(val.toMillis());
        }
        return undefined;
      }),
    fromFirestore: (
      s: QueryDocumentSnapshot<DocumentData>,
      options: SnapshotOptions
    ): V => {
      let data = s.data(options);
      if (idField) {
        data = { ...data, [idField]: s.id };
      }

      const validationResult = validator.decode(data);
      if (isRight(validationResult)) {
        return validationResult.right;
      } else {
        console.error(`bad doc: ${collectionName}/${s.id}`);
        console.error(PathReporter.report(validationResult).join(','));
        throw new Error('Malformed content');
      }
    },
  });
}

export const getDocRef = (collectionName: string, docId: string) =>
  doc(getCollection(collectionName), docId);

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
  const userCredential = await sIA(getAuth());
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
