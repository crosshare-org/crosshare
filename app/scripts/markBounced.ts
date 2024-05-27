#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '../lib/firebaseAdminWrapper.js';

if (process.argv.length !== 3) {
  throw Error(
    'Invalid use of markBounced. Usage: ./scripts/markBounced.ts [email]'
  );
}

export async function markBounced() {
  const emailToUnsub = process.argv[2]?.trim();
  if (!emailToUnsub) {
    console.error('missing email');
    return;
  }

  const db = getFirestore(getAdminApp());

  await getAuth()
    .getUserByEmail(emailToUnsub)
    .then((user) =>
      db
        .collection('prefs')
        .doc(user.uid)
        .set({ bounced: true }, { merge: true })
    )
    .catch((error: unknown) => {
      console.error('error setting bounced', error);
    });
}

markBounced()
  .then(() => {
    console.log('Done');
  })
  .catch((e: unknown) => {
    console.error(e);
  });
