#!/usr/bin/env -S npx tsx

import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '../lib/firebaseAdminWrapper.js';
export {};

if (process.argv.length !== 2) {
  throw Error('Invalid use of migrate. Usage: ./scripts/migrate.ts');
}

const db = getFirestore(getAdminApp());

async function runMigration() {
  console.log('Run migration here...');
  return db
    .collection('n')
    .where('u', '==', 'caC9qBPqHxhcOOkIzoac6CTSRds2')
    .get()
    .then((snap) => {
      const batch = db.batch();
      snap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      return batch.commit();
    });
}

runMigration()
  .then((c) => {
    console.log('Finished migration', c);
  })
  .catch((e: unknown) => {
    console.error(e);
  });
