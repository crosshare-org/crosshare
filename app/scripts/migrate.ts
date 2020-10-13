#!/usr/bin/env ts-node-script --skip-project -O {"resolveJsonModule":true}

import { AdminApp } from '../lib/firebaseWrapper';

if (process.argv.length !== 2) {
  throw Error('Invalid use of migrate. Usage: ./scripts/migrate.ts');
}

const db = AdminApp.firestore();

async function runMigration() {
  const value = await db.collection('n').get();
  return Promise.all(value.docs.map(n => db.doc(`n/${n.id}`).update({ e: false })));
}

runMigration().then(() => {
  console.log('Finished migration');
});
