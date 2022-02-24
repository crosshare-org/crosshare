#!/usr/bin/env -S npx ts-node-script

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { DBPuzzleV } from '../lib/dbtypes';

import { AdminApp } from '../lib/firebaseAdminWrapper';
import { getFirestore } from 'firebase-admin/firestore';

if (process.argv.length !== 3) {
  throw Error(
    'Invalid use of deletePuzzle. Usage: ./scripts/deletePuzzle.ts [puzzleId]'
  );
}

const db = getFirestore(AdminApp);

async function deletePuzzle() {
  console.log(`deleting ${process.argv[2]}`);
  const dbres = await db.doc(`c/${process.argv[2]}`).get();
  if (!dbres.exists) {
    console.error('no such puzzle');
    return;
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (!isRight(validationResult)) {
    console.error(PathReporter.report(validationResult).join(','));
    return;
  }
  const dbpuz = validationResult.right;

  if (dbpuz.dmd) {
    console.error(`Can't delete daily mini`);
    return;
  }

  console.log('deleting notifications');
  db.collection('n')
    .where('p', '==', dbres.id)
    .get()
    .then((snap) => {
      snap.forEach(async (res) => {
        console.log('deleting notification');
        await res.ref.delete();
      });
    });

  console.log('deleting plays');
  db.collection('p')
    .where('c', '==', dbres.id)
    .get()
    .then((snap) => {
      snap.forEach(async (res) => {
        console.log('deleting play');
        await res.ref.delete();
      });
    });

  console.log('deleting puzzle');
  await db.doc(`c/${process.argv[2]}`).delete();
}

deletePuzzle().then(() => {
  console.log('Done');
});
