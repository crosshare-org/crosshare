#!/usr/bin/env -S npx ts-node-script

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { DBPuzzleV } from '../lib/dbtypes';
import { getAdminApp } from '../lib/firebaseAdminWrapper';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (process.argv.length !== 3) {
  throw Error(
    'Invalid use of emailForPuzzleId. Usage: ./scripts/emailForPuzzleId.ts [puzzleId]'
  );
}

const db = getFirestore(getAdminApp());

async function generatePuzFile() {
  console.log(`getting puzzle ${process.argv[2]}`);
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
  const user = await getAuth(getAdminApp()).getUser(dbpuz.a);
  console.log(`email: ${user.email}`);
}

generatePuzFile().then(() => {
  console.log('Done');
});
