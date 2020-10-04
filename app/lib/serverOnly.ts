import { AdminApp, AdminTimestamp } from '../lib/firebaseWrapper';
import { PuzzleResult, puzzleFromDB } from './types';
import type firebaseAdminType from 'firebase-admin';

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { DBPuzzleV, DBPuzzleT } from './dbtypes';
import { adminTimestamp } from './adminTimestamp';
import { mapEachResult } from './dbUtils';
import { ConstructorPageT, ConstructorPageV } from './constructorPage';

export async function getStorageUrl(storageKey: string): Promise<string | null> {
  const profilePic = AdminApp.storage().bucket().file(storageKey);
  if ((await profilePic.exists())[0]) {
    try {
      return (await profilePic.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      }))[0];
    } catch (e) {
      console.log('error getting profile pic', storageKey, e);
    }
  } else {
    console.log('pic doesnt exist', storageKey);
  }
  return null;
}

const PuzzleIndexV = t.type({
  /** array of puzzle timestamps */
  t: t.array(adminTimestamp),
  /** array of puzzle ids */
  i: t.array(t.string)
});
type PuzzleIndexT = t.TypeOf<typeof PuzzleIndexV>;

async function getPuzzlesForPage(indexDocId: string, queryField: string, queryValue: string | boolean, page: number, page_size: number): Promise<[Array<PuzzleResult>, PuzzleIndexT]> {
  const db = AdminApp.firestore();
  const indexDoc = await db.collection('i').doc(indexDocId).get();
  let index: PuzzleIndexT | null = null;
  if (indexDoc.exists) {
    const validationResult = PuzzleIndexV.decode(indexDoc.data());
    if (isRight(validationResult)) {
      index = validationResult.right;
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      throw new Error('failed to validate index for ' + indexDocId);
    }
  }
  if (index === null) {
    console.log('No index, initializing', indexDocId);
    index = { t: [], i: [] };
  }

  let q = db.collection('c').where(queryField, '==', queryValue).orderBy('p', 'desc');
  if (index.i.length) {
    const mostRecentTimestamp = index.t[0];
    if (mostRecentTimestamp) {
      q = q.endBefore(mostRecentTimestamp);
    }
  }
  const newPuzzles: Array<DBPuzzleT & { id: string }> = await mapEachResult(q, DBPuzzleV, (dbpuzz, docId) => {
    return { ...dbpuzz, id: docId };
  });

  if (newPuzzles.length) {
    console.log(`Adding ${newPuzzles.length} to index for ${indexDocId}`);
    // Add new puzzles to the beginning
    for (const p of newPuzzles.reverse()) {
      index.t.unshift(AdminTimestamp.fromMillis(p.p.toMillis()));
      index.i.unshift(p.id);
    }
    await db.collection('i').doc(indexDocId).set(index);
  }
  const start = page * page_size;
  const entriesForPage = index.i.slice(start, start + page_size);

  const puzzles: Array<PuzzleResult> = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const puzzleId of entriesForPage) {
    const alreadyHave = newPuzzles.find(x => x.id === puzzleId);
    if (alreadyHave) {
      puzzles.push({ ...puzzleFromDB(alreadyHave), id: alreadyHave.id });
      continue;
    }

    const dbres = await db.collection('c').doc(puzzleId).get();
    if (!dbres.exists) {
      console.warn('Puzzle id in index but no puzzle exists ', puzzleId);
      continue;
    }
    const validationResult = DBPuzzleV.decode(dbres.data());
    if (isRight(validationResult)) {
      puzzles.push({ ...puzzleFromDB(validationResult.right), id: dbres.id });
    } else {
      console.error('Puzzle id in index but invalid puzzle', puzzleId);
      console.error(PathReporter.report(validationResult).join(','));
    }
  }
  return [puzzles, index];
}

export async function getPuzzlesForConstructorPage(userId: string, page: number, page_size: number): Promise<[Array<PuzzleResult>, PuzzleIndexT]> {
  return getPuzzlesForPage(userId, 'a', userId, page, page_size);
}

export async function getPuzzlesForFeatured(page: number, page_size: number): Promise<[Array<PuzzleResult>, PuzzleIndexT]> {
  return getPuzzlesForPage('featured', 'f', true, page, page_size);
}

const usernameMap: Record<string, ConstructorPageT> = {};
let usernamesUpdated: number | null = null;
const usernamesTTL = 1000 * 60 * 10;

export async function userIdToPage(userId: string): Promise<ConstructorPageT | null> {
  const now = Date.now();
  if (usernamesUpdated === null || now - usernamesUpdated > usernamesTTL) {
    const db = AdminApp.firestore();
    let query: firebaseAdminType.firestore.Query = db.collection('cp');
    if (usernamesUpdated) {
      query = query.where('t', '>=', AdminTimestamp.fromMillis(usernamesUpdated));
    }
    try {
      await mapEachResult(query,
        ConstructorPageV, (cp, docId) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { t, ...partial } = cp;
          usernameMap[cp.u] = { ...partial, id: docId };
        });
      usernamesUpdated = now;
    } catch (e) {
      console.error('error updating constructor pages');
      console.error(e);
    }
  }
  return usernameMap[userId] || null;
}

export async function sendEmail(toAddress: string, subject: string, text: string, html: string) {
  const db = AdminApp.firestore();
  return db.collection('mail').add({
    to: [toAddress],
    message: { subject, text, html }
  });
}
