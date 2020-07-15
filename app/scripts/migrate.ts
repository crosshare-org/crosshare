#!/usr/bin/env ts-node-script --skip-project -O {"resolveJsonModule":true}

import * as admin from 'firebase-admin';

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { DBPuzzleV } from '../lib/dbtypes';

import * as serviceAccount from '../../serviceAccountKey.json';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

if (process.argv.length !== 2) {
  throw Error('Invalid use of migrate. Usage: ./scripts/migrate.ts');
}

const db = admin.firestore();

async function runMigration() {
  const value = await db.collection('c').get();
  for (const doc of value.docs) {
    const res = DBPuzzleV.decode(doc.data());
    if (!isRight(res)) {
      console.error(PathReporter.report(res).join(','));
      console.error('Malformed puzzle: ' + doc.id);
      continue;
    }
    const puzzle = res.right;
    if (puzzle.ca.toMillis() !== puzzle.p ?.toMillis()) {
      console.log('Updating puzzle ', doc.id);
      await db.collection('c').doc(doc.id).update({ p: admin.firestore.Timestamp.fromMillis(puzzle.ca.toMillis()) });
    }
  }
}

runMigration().then(() => {
  console.log('Finished migration');
});
