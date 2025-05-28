#!/usr/bin/env -S npx tsx

import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ConstructorPageV } from '../lib/constructorPage.js';
import {
  ConstructorStatsV,
  DBPuzzleV,
  FollowersV,
  PuzzleStatsV,
} from '../lib/dbtypes.js';
import { getAdminApp } from '../lib/firebaseAdminWrapper.js';

if (process.argv.length !== 4) {
  throw Error(
    'Invalid use of migrateAccount. Usage: ./scripts/migrateAccount.ts fromEmail toEmail'
  );
}

// TODO we migrate followers but should we also migrate following?
// TODO what about migrating solver prefs, etc.?

const db = getFirestore(getAdminApp());

async function migrateAccount() {
  const fromEmail = process.argv[2];
  const toEmail = process.argv[3];
  if (!fromEmail || !toEmail) {
    console.error('must provide fromEmail and toEmail');
    return;
  }

  const auth = getAuth(getAdminApp());
  const fromUser = await auth.getUserByEmail(fromEmail);
  const toUser = await auth.getUserByEmail(toEmail);
  console.log(`migrating from ${fromUser.uid} to ${toUser.uid}`);

  // move puzzles
  await db
    .collection('c')
    .where('a', '==', fromUser.uid)
    .get()
    .then(async (snap) => {
      await Promise.all(
        snap.docs.map(async (doc) => {
          const validationResult = DBPuzzleV.decode(doc.data());
          if (validationResult._tag !== 'Right') {
            console.log('INVALID', doc.id);
            return;
          }
          console.log(`move ${validationResult.right.t} to ${toUser.uid}`);
          await db.collection('c').doc(doc.id).update({ a: toUser.uid });

          // move puzzle stats
          const puzzleStatsRes = await db.collection('s').doc(doc.id).get();
          const vr = PuzzleStatsV.decode(puzzleStatsRes.data());
          if (vr._tag !== 'Right') {
            console.log('INVALID STATS', doc.id);
            return;
          }
          console.log(`move stats ${vr.right.n} to ${toUser.uid}`);
          await db.collection('s').doc(doc.id).update({ a: toUser.uid });
        })
      );
    });

  // move constructor page
  const cp = await db
    .collection('cp')
    .where('u', '==', fromUser.uid)
    .get()
    .then((snap) => {
      const doc = snap.docs[0];
      if (!doc) {
        return null;
      }
      const validationResult = ConstructorPageV.decode(doc.data());
      if (validationResult._tag !== 'Right') {
        console.log('INVALID', doc.id);
        return null;
      }
      return { ...validationResult.right, id: doc.id };
    });
  if (cp) {
    console.log(`move cp ${cp.i}`);
    await db.collection('cp').doc(cp.id).update({ u: toUser.uid });
  }
    // merge constructor stats
    const oldCS = await db
      .collection('cs')
      .doc(fromUser.uid)
      .get()
      .then((snap) => {
        const validationResult = ConstructorStatsV.decode(snap.data());
        if (validationResult._tag !== 'Right') {
          console.log('INVALID', snap.id);
          return null;
        }
        return validationResult.right;
      });
    if (oldCS) {
      console.log(`merge CS`);
      await db.collection('cs').doc(toUser.uid).set(oldCS, { merge: true });
    }

    console.log('migrating followers');
    // move followers
    const followers = await db
      .collection('followers')
      .doc(fromUser.uid)
      .get()
      .then((snap) => {
        const validationResult = FollowersV.decode(snap.data());
        if (validationResult._tag !== 'Right') {
          console.log('INVALID', snap.id);
          return null;
        }
        return validationResult.right;
      });
    if (followers?.f?.length) {
      await db
        .collection('followers')
        .doc(toUser.uid)
        .set({ f: FieldValue.arrayUnion(...followers.f) }, { merge: true });
      console.log(`moving ${followers.f.length} followers`);
      for (const follower of followers.f) {
        await db
          .collection('prefs')
          .doc(follower)
          .set(
            { following: FieldValue.arrayUnion(toUser.uid) },
            { merge: true }
          );
        await db
          .collection('prefs')
          .doc(follower)
          .update({ following: FieldValue.arrayRemove(fromUser.uid) });
      }
  }
}

migrateAccount()
  .then(() => {
    console.log('Migrated');
  })
  .catch((e: unknown) => {
    console.error('migration failed', e);
  });
