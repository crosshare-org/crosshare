/* eslint-disable @typescript-eslint/no-explicit-any */
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  User,
  connectAuthEmulator,
  getAuth as gA,
  signInAnonymously as sIA,
} from 'firebase/auth';
import {
  CollectionReference,
  Timestamp as FBTimestamp,
  Firestore,
  QueryDocumentSnapshot,
  SnapshotOptions,
  collection,
  connectFirestoreEmulator,
  doc,
  getFirestore,
} from 'firebase/firestore';
import { connectStorageEmulator, getStorage as gS } from 'firebase/storage';
import * as t from 'io-ts';
import cloneDeepWith from 'lodash/cloneDeepWith.js';
import { firebaseConfig as firebaseEmulatorConfig } from '../firebaseConfig.emulators.js';
import { firebaseConfig } from '../firebaseConfig.js';
import { PathReporter } from './pathReporter.js';
import { isTimestamp } from './timestamp.js';

// Initialize Firebase
let App: FirebaseApp;
let db: Firestore;

const apps = getApps();
if (apps.length && apps[0]) {
  App = apps[0];
  db = getFirestore(App);
} else {
  // Init emulator
  if (process.env.NEXT_PUBLIC_USE_EMULATORS) {
    App = initializeApp(firebaseEmulatorConfig);
    db = getFirestore(App);

    console.log('Connecting to emulators');
    connectFirestoreEmulator(db, 'localhost', 8080);

    const auth = gA(App);
    connectAuthEmulator(auth, 'http://localhost:9099', {
      disableWarnings: true,
    });

    const storage = gS(App);
    connectStorageEmulator(storage, 'localhost', 9199);
  } else {
    App = initializeApp(firebaseConfig);
    db = getFirestore(App);
  }
}

export const getDocId = (collectionName: string) =>
  doc(collection(db, collectionName)).id;

export const getAuth = () => gA(App);
export const getStorage = () => gS(App);

export const convertTimestamps = (data: any): Record<string, unknown> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cloneDeepWith(data, (val) => {
    if (isTimestamp(val)) {
      return FBTimestamp.fromMillis(val.toMillis());
    }
    return undefined;
  });

export const converter = {
  toFirestore: convertTimestamps,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  fromFirestore: (s: any) => s.data(),
};

export const getCollection = (collectionName: string) =>
  collection(db, collectionName).withConverter(converter);

export function getValidatedCollection<V>(
  collectionName: string,
  validator: t.Decoder<unknown, V>,
  idField: string | null = null
): CollectionReference<V, Record<string, unknown>> {
  return collection(db, collectionName).withConverter({
    toFirestore: convertTimestamps,
    fromFirestore: (s: QueryDocumentSnapshot, options: SnapshotOptions): V => {
      let data = s.data(options);
      if (idField) {
        data = { ...data, [idField]: s.id };
      }

      const validationResult = validator.decode(data);
      if (validationResult._tag === 'Right') {
        return validationResult.right;
      } else {
        console.error(`bad doc: ${collectionName}/${s.id}`);
        console.error(PathReporter.report(validationResult).join(','));
        throw new Error('Malformed content');
      }
    },
    // TODO not sure why this cast became necessary w/ the latest firebase+typescript upgrade. Try reverting next update.
  }) as CollectionReference<V, Record<string, unknown>>;
}

export const getDocRef = (collectionName: string, docId: string) =>
  doc(getCollection(collectionName), docId);

export const setApp = (app: FirebaseApp) => {
  App = app;
};
export const setUpForSignInAnonymously = (_app: FirebaseApp, _user: User) => {
  throw new Error('For testing only');
};

export const signInAnonymously = async () => {
  const userCredential = await sIA(getAuth());
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
  if (!userCredential.user) {
    throw new Error('Logged in anonymously but no user in result');
  }
  return userCredential.user;
};

export const setUserMap = (_map: Record<string, User>) => {
  /* noop */
};
