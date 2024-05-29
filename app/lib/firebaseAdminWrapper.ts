import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  Timestamp as FBTimestamp,
  Query,
  getFirestore,
} from 'firebase-admin/firestore';
import * as t from 'io-ts';
import cloneDeepWith from 'lodash/cloneDeepWith.js';
import { firebaseConfig as firebaseEmulatorConfig } from '../firebaseConfig.emulators.js';
import { firebaseConfig } from '../firebaseConfig.js';
import { PathReporter } from './pathReporter.js';
import { isTimestamp } from './timestamp.js';

export function getAdminApp() {
  const app = getApps()[0];
  if (app) {
    return app;
  }
  if (process.env.NEXT_PUBLIC_USE_EMULATORS) {
    console.log('Initializing admin app for emulators');
    return initializeApp(firebaseEmulatorConfig);
  }
  return initializeApp({
    ...firebaseConfig,
    credential: applicationDefault(),
  });
}

export const getUser = (userId: string) =>
  getAuth(getAdminApp()).getUser(userId);

let OVERRIDE_FIRESTORE: FirebaseFirestore.Firestore | null = null;
export function overrideFirestore(f: FirebaseFirestore.Firestore | null) {
  OVERRIDE_FIRESTORE = f;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
export const firestore = () =>
  OVERRIDE_FIRESTORE || getFirestore(getAdminApp());

let OVERRIDE_TO_FIRESTORE: ((data: unknown) => Record<string, unknown>) | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toFirestore = (data: any): Record<string, unknown> => {
  if (OVERRIDE_TO_FIRESTORE) {
    return OVERRIDE_TO_FIRESTORE(data);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return cloneDeepWith(data, (val) => {
    if (isTimestamp(val)) {
      return FBTimestamp.fromMillis(val.toMillis());
    }
    return undefined;
  });
};

export function overrideToFirestore(
  c: ((data: unknown) => Record<string, unknown>) | null
) {
  OVERRIDE_TO_FIRESTORE = c;
}

export const getCollection = (c: string) => {
  const db = firestore();
  return db.collection(c).withConverter({
    toFirestore: toFirestore,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    fromFirestore: (s: any) => s.data(),
  });
};

export async function mapEachResult<N, A>(
  query: Query,
  validator: t.Decoder<unknown, A>,
  mapper: (val: A, docid: string) => N
): Promise<N[]> {
  const value = await query.get();
  const results: N[] = [];
  for (const doc of value.docs) {
    const data = doc.data();
    const validationResult = validator.decode(data);
    if (validationResult._tag === 'Right') {
      results.push(mapper(validationResult.right, doc.id));
    } else {
      console.error('bad doc: ', doc.id);
      console.error(PathReporter.report(validationResult).join(','));
      return Promise.reject(new Error('Malformed content'));
    }
  }
  return results;
}
