#!/usr/bin/env ts-node-script --skip-project -O {"resolveJsonModule":true,"esModuleInterop":true}

import { AdminApp } from '../lib/firebaseWrapper';

if (process.argv.length !== 2) {
  throw Error('Invalid use of migrate. Usage: ./scripts/migrate.ts');
}

const db = AdminApp.firestore();

async function runMigration() {
  const value = await db.collection('s').get();
  return Promise.all(
    value.docs.map((n) =>
      db.doc(`s/${n.id}`).update({
        sct: Array.from(
          { length: 6 },
          () => Math.random().toString(36)[2]
        ).join(''),
      })
    )
  );
}

runMigration().then(() => {
  console.log('Finished migration');
});
