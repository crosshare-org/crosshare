#!/usr/bin/env -S npx ts-node-script

import { isRight } from 'fp-ts/lib/Either';
import { DBPuzzleV } from '../lib/dbtypes';
import { AdminApp } from '../lib/firebaseWrapper';
export {};

if (process.argv.length !== 2) {
  throw Error('Invalid use of migrate. Usage: ./scripts/migrate.ts');
}

const db = AdminApp.firestore();

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
