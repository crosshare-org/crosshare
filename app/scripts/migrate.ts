#!/usr/bin/env -S npx ts-node-script

import { isRight } from 'fp-ts/lib/Either';
import { DBPuzzleV } from '../lib/dbtypes';
import { AdminApp, AdminTimestamp } from '../lib/firebaseWrapper';
import firebaseAdmin from 'firebase-admin';
export {};

if (process.argv.length !== 2) {
  throw Error('Invalid use of migrate. Usage: ./scripts/migrate.ts');
}

const db = AdminApp.firestore();
let count = 0;

async function runMigration() {
  console.log('Run migration here...');
  return db.collection('c').get().then(snap => {
    snap.forEach(async doc => {
      count += 1;
      const validationResult = DBPuzzleV.decode(doc.data());
      if (!isRight(validationResult)) {
        console.log('INVALID', doc.id);
        return;
      }
      const puz = validationResult.right;
      if (puz.pv) {
        if (puz.pvu) {
          console.log('both private and private until', puz);
          await db.collection('c').doc(doc.id).update({pvu: firebaseAdmin.firestore.FieldValue.delete()});
        }
      } else if (!puz.pvu) {
        console.log('adding private until');
        await db.collection('c').doc(doc.id).update({pvu: AdminTimestamp.fromMillis(puz.p.toMillis())});
      }
    });
  });
}

runMigration().then(() => {
  console.log('Finished migration');
  console.log(`${count} puzzles`);
});
