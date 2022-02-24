/* this is the firebase timestamp type for the main react project! */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import type firebase from 'firebase/compat/app';

import { TimestampClass } from './firebaseWrapper';

const isFirestoreTimestamp = (u: unknown): u is firebase.firestore.Timestamp =>
  u ? u instanceof TimestampClass : false;

const validateTimestamp: t.Validate<unknown, firebase.firestore.Timestamp> = (
  i,
  c
) => {
  if (isFirestoreTimestamp(i)) {
    return t.success(i);
  }
  return either.chain(
    t.type({ seconds: t.number, nanoseconds: t.number }).validate(i, c),
    (obj) => t.success(new TimestampClass(obj.seconds, obj.nanoseconds))
  );
};

export const timestamp = new t.Type<firebase.firestore.Timestamp>(
  'Timestamp',
  isFirestoreTimestamp,
  validateTimestamp,
  t.identity
);
