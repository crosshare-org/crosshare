#!/usr/bin/env -S npx tsx

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '../lib/firebaseAdminWrapper.js';

async function processLineByLine() {
  const db = getFirestore(getAdminApp());

  const fileStream = createReadStream('opt-outs.txt');

  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    console.log(`Opting out: ${line}`);
    await getAuth()
      .getUserByEmail(line.trim())
      .then((user) => {
        console.log(user.uid);
        return db
          .collection('prefs')
          .doc(user.uid)
          .set({ unsubs: FieldValue.arrayUnion('weekly') }, { merge: true });
      })
      .catch((error: unknown) => {
        console.error('error setting bounced', error);
      });
  }
}

processLineByLine()
  .then(() => {
    console.log('Done');
  })
  .catch((e: unknown) => {
    console.error(e);
  });
