import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from '../firebaseConfig';
import {
  getFirestore,
  Timestamp as FBTimestamp,
} from 'firebase-admin/firestore';
import { cloneDeepWith } from 'lodash';
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

export const firestore = () => getFirestore(getAdminApp());

export const collectionWithConverter = (c: string) => {
  const db = firestore();
  return db.collection(c).withConverter({
    toFirestore: (data: any) =>
      cloneDeepWith(data, (val) => {
        if (isTimestamp(val)) {
          return FBTimestamp.fromMillis(val.toMillis());
        }
        return undefined;
      }),
    fromFirestore: (s: any) => s,
  });
};
