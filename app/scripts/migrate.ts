#!/usr/bin/env ts-node-script

import * as admin from 'firebase-admin';

/*import { PathReporter } from "io-ts/lib/PathReporter";
import { isRight } from "fp-ts/lib/Either";
import { PlayV, UserPlayT } from '../../functions/src/common/dbtypes';*/

import serviceAccount from '../../serviceAccountKey.json';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

if (process.argv.length !== 2) {
  throw Error('Invalid use of makeAdmin. Usage: node migrate.js');
}

//const db = admin.firestore()

async function runMigration() {
  /*  const value = await db.collection('p').get();
    for (const doc of value.docs) {
      const res = PlayV.decode(doc.data())
      if (!isRight(res)) {
        console.error(PathReporter.report(res).join(","));
        throw new Error("Malformed play");
      }
      const userPlay: UserPlayT = [res.right.ua, res.right.t, res.right.ch, res.right.f, res.right.n];
      db.collection('up').doc(res.right.u).set({
        [res.right.c]: userPlay
      }, { merge: true });
    }*/
}

runMigration().then(() => {
  console.log('Finished migration');
});
