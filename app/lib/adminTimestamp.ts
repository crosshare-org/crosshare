/* this is the firebase timestamp type for the main react project! */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

import { AdminTimestamp } from './firebaseWrapper';
import type firebaseAdminType from 'firebase-admin';

const isFirestoreTimestamp = (u: unknown): u is firebaseAdminType.firestore.Timestamp =>
  u ? u instanceof AdminTimestamp : false;

const validateTimestamp: t.Validate<unknown, firebaseAdminType.firestore.Timestamp> = (i, c) => {
  if (isFirestoreTimestamp(i)) {
    return t.success(i);
  }
  return either.chain(
    t.type({ seconds: t.number, nanoseconds: t.number }).validate(i, c),
    obj => t.success(new AdminTimestamp(obj.seconds, obj.nanoseconds))
  );
};

export const adminTimestamp = new t.Type<firebaseAdminType.firestore.Timestamp>(
  'AdminTimestamp',
  isFirestoreTimestamp,
  validateTimestamp,
  t.identity,
);
