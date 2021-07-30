#!/usr/bin/env -S npx -s sh ts-node-script

import admin from 'firebase-admin';
import { isRight } from 'fp-ts/lib/Either';

import { LegacyPlayV } from '../lib/dbtypes';
import { CrosshareGlickoRound } from '../lib/glicko';

//admin.initializeApp({ projectId: 'mdcrosshare' });
const db = admin.firestore();

const startHours = Math.floor(1586895805 / (60 * 60 * 24));
const nowHours = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));

async function doGlicko() {
  for (let roundNumber = startHours; roundNumber < nowHours; roundNumber += 1) {
    const round = new CrosshareGlickoRound(roundNumber);

    const startTimestamp = admin.firestore.Timestamp.fromMillis(
      roundNumber * 60 * 60 * 1000 * 24
    );
    const endTimestamp = admin.firestore.Timestamp.fromMillis(
      (roundNumber + 1) * 60 * 60 * 1000 * 24
    );
    const value = await db
      .collection('p')
      .where('f', '==', true)
      .where('ua', '>=', startTimestamp)
      .where('ua', '<', endTimestamp)
      .orderBy('ua', 'asc')
      .get();
    console.log('doing round for ' + value.size + ' plays');
    for (const doc of value.docs) {
      const validationResult = LegacyPlayV.decode(doc.data());
      if (!isRight(validationResult)) {
        throw new Error('Malformed play');
      }
      const play = validationResult.right;
      round.addPlayToRound(play);
    }
    await round.computeAndUpdate();
  }

  console.log(
    (await db.collection('c').doc('dOO3V7B3evfs1Dobz2p6').get()).data()
  );

  console.log(
    (await db.collection('c').doc('iJG3LMzqL1XP7k9ko1Zj').get()).data()
  );

  console.log(
    (await db.collection('c').doc('GBkrTBTQHYVdQXJR741f').get()).data()
  );

  console.log(
    await (
      await db.collection('prefs').doc('fSEwJorvqOMK5UhNMHa4mu48izl1').get()
    ).data()
  );
}

doGlicko().then(() => {
  console.log('Finished');
});
