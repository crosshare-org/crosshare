#!/usr/bin/env -S npx ts-node-script

import { getFirestore } from 'firebase-admin/firestore';
import { isRight } from 'fp-ts/lib/Either';
import { DBPuzzleV } from '../lib/dbtypes';
import { getAdminApp } from '../lib/firebaseAdminWrapper';
export {};

if (process.argv.length !== 2) {
  throw Error('Invalid use of migrate. Usage: ./scripts/migrate.ts');
}

const db = getFirestore(getAdminApp());

async function runMigration() {
  console.log('Run migration here...');
  return db.collection('c').get().then(snap => {
    snap.forEach(async doc => {
      const validationResult = DBPuzzleV.decode(doc.data());
      if (!isRight(validationResult)) {
        console.log('INVALID', doc.id);
        return;
      }
    });
  });
}

runMigration().then(() => {
  console.log('Finished migration');
});
