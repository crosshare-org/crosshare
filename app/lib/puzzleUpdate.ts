import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AdminApp } from '../lib/firebaseWrapper';
import { DBPuzzleT, DBPuzzleV } from './dbtypes';
import { notificationsForPuzzleChange } from './notifications';
import { PuzzleIndexV } from '../lib/serverOnly';

async function removeFromIndex(
  indexRes: FirebaseFirestore.DocumentSnapshot,
  puzzleId: string
) {
  console.log(`attempting delete for ${indexRes.id}`);
  if (!indexRes.exists) {
    console.log('no index, skipping');
    return;
  }

  const validationResult = PuzzleIndexV.decode(indexRes.data());
  if (!isRight(validationResult)) {
    console.error(PathReporter.report(validationResult).join(','));
    return;
  }
  const idx = validationResult.right;
  const pi = idx.i.indexOf(puzzleId);
  if (pi < 0) {
    console.log('puzzle not in index');
    return;
  }

  console.log('splicing out ', idx.i.splice(pi, 1));
  idx.t.splice(pi, 1);

  console.log('writing');
  await indexRes.ref.set(idx);
}

async function deletePuzzle(puzzleId: string, dbpuz: DBPuzzleT) {
  console.log(`deleting ${puzzleId}`);
  const db = AdminApp.firestore();

  if (dbpuz.c) {
    console.error(`Can't delete for category ${dbpuz.c}`);
    return;
  }

  console.log('deleting notifications');
  db.collection('n')
    .where('p', '==', puzzleId)
    .get()
    .then((snap) => {
      snap.forEach(async (res) => {
        console.log('deleting notification');
        await res.ref.delete();
      });
    });

  console.log('deleting plays');
  db.collection('p')
    .where('c', '==', puzzleId)
    .get()
    .then((snap) => {
      snap.forEach(async (res) => {
        console.log('deleting play');
        await res.ref.delete();
      });
    });

  const featuredIndexRes = await db.doc('i/featured').get();
  removeFromIndex(featuredIndexRes, puzzleId);

  const authorIndexRes = await db.doc(`i/${dbpuz.a}`).get();
  removeFromIndex(authorIndexRes, puzzleId);

  console.log('deleting puzzle');
  await db.doc(`c/${puzzleId}`).delete();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePuzzle(docdata: any): DBPuzzleT | null {
  const validationResult = DBPuzzleV.decode(docdata);
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
}

export async function handlePuzzleUpdate(
  beforeData: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  afterData: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  puzzleId: string
): Promise<void> {
  const db = AdminApp.firestore();

  const after = parsePuzzle(afterData);
  if (!after) {
    console.error('Missing/invalid after doc', afterData);
    return;
  }

  let before: DBPuzzleT | null = null;
  if (beforeData !== undefined) {
    before = parsePuzzle(beforeData);
    if (!before) {
      console.error('Missing/invalid before doc', beforeData, afterData);
      return;
    }
  }

  if (after.del) {
    await deletePuzzle(puzzleId, after);
    console.log('Puzzle deleted');
    return;
  }

  const notifications = await notificationsForPuzzleChange(
    before,
    after,
    puzzleId
  );
  for (const notification of notifications) {
    await db.doc(`n/${notification.id}`).set(notification);
  }
  console.log(`Created ${notifications.length} notifications`);
}
