import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from '../firebaseConfig';
import {
  getFirestore,
  Query,
  Timestamp as FBTimestamp,
} from 'firebase-admin/firestore';
import cloneDeepWith from 'lodash/cloneDeepWith';
import { isTimestamp } from './timestamp';

export function getAdminApp() {
  const app = getApps()[0];
  if (app) {
    return app;
  }
  return initializeApp({
    ...firebaseConfig,
    credential: applicationDefault(),
  });
}

export const getUser = (userId: string) =>
  getAuth(getAdminApp()).getUser(userId);

const firestore = () => getFirestore(getAdminApp());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toFirestore = (data: any): Record<string, unknown> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cloneDeepWith(data, (val) => {
    if (isTimestamp(val)) {
      return FBTimestamp.fromMillis(val.toMillis());
    }
    return undefined;
  });

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
    if (isRight(validationResult)) {
      results.push(mapper(validationResult.right, doc.id));
    } else {
      console.error('bad doc: ', doc.id);
      console.error(PathReporter.report(validationResult).join(','));
      return Promise.reject('Malformed content');
    }
  }
  return results;
}
