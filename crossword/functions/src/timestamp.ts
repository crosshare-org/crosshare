/* this is the firebase timestamp type for the functions! */

import * as admin from 'firebase-admin';

import * as t from "io-ts";
import { either } from "fp-ts/lib/Either";

const isFirestoreTimestamp = (u: unknown): u is admin.firestore.Timestamp =>
  u ? u instanceof admin.firestore.Timestamp : false;

const validateTimestamp: t.Validate<unknown, admin.firestore.Timestamp> = (i, c) => {
  if (isFirestoreTimestamp(i)) {
    return t.success(i);
  }
  return either.chain(
    t.type({ seconds: t.number, nanoseconds: t.number }).validate(i, c),
    obj => t.success(new admin.firestore.Timestamp(obj.seconds, obj.nanoseconds))
  );
}

export const timestamp = new t.Type<admin.firestore.Timestamp>(
  'Timestamp',
  isFirestoreTimestamp,
  validateTimestamp,
  t.identity,
);
