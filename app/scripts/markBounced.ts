#!/usr/bin/env -S npx tsx

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '../lib/firebaseAdminWrapper.js';

if (process.argv.length < 3) {
  throw Error(
    'Invalid use of markBounced. Usage: ./scripts/markBounced.ts [...emails]'
  );
}

export async function markBounced() {
  for (const arg of process.argv.splice(2)) {
    const emailToUnsub = arg.trim();
    if (!emailToUnsub) {
      console.error('missing email');
      return;
    }

    console.log('unsubbing', arg);

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
}

markBounced()
  .then(() => {
    console.log('Done');
  })
  .catch((e: unknown) => {
    console.error(e);
  });
