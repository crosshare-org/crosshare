import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AdminApp, AdminTimestamp } from '../lib/firebaseWrapper';
import { DBPuzzleT, DBPuzzleV } from './dbtypes';
import { notificationsForPuzzleChange } from './notifications';
import { PuzzleIndexV, PuzzleIndexT } from '../lib/serverOnly';

function parseIndex(
  indexRes: FirebaseFirestore.DocumentSnapshot
): PuzzleIndexT | null {
  if (!indexRes.exists) {
    console.log('no index, skipping');
    return null;
  }

  const validationResult = PuzzleIndexV.decode(indexRes.data());
  if (!isRight(validationResult)) {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
  return validationResult.right;
}

async function markPuzzlePrivate(
  indexRes: FirebaseFirestore.DocumentSnapshot,
  puzzleId: string
) {
  console.log(`attempting mark private for ${indexRes.id}`);
  const idx = parseIndex(indexRes);
  if (idx === null) {
    return;
  }
  if (!idx.i.includes(puzzleId)) {
    console.log('puzzle not in index');
    return;
  }

  // remove from private until index if present
  if (idx.pvui?.includes(puzzleId) && idx.pvut) {
    const pvidx = idx.pvui.indexOf(puzzleId);
    console.log('splicing out ', idx.pvui.splice(pvidx, 1));
    idx.pvut.splice(pvidx, 1);
  }

  if (!idx.pv) {
    idx.pv = [puzzleId];
  } else if (!idx.pv.includes(puzzleId)) {
    idx.pv.push(puzzleId);
  }

  console.log('writing');
  await indexRes.ref.set(idx);
}

async function markPuzzlePublic(
  indexRes: FirebaseFirestore.DocumentSnapshot,
  puzzleId: string
) {
  console.log(`attempting mark public for ${indexRes.id}`);
  const idx = parseIndex(indexRes);
  if (idx === null) {
    return;
  }
  if (!idx.i.includes(puzzleId)) {
    console.log('puzzle not in index');
    return;
  }

  // remove from private until index if present
  if (idx.pvui?.includes(puzzleId) && idx.pvut) {
    const pvidx = idx.pvui.indexOf(puzzleId);
    console.log('splicing out ', idx.pvui.splice(pvidx, 1));
    idx.pvut.splice(pvidx, 1);
  }

  // remove from private index if present
  const pvi = idx.pv?.indexOf(puzzleId);
  if (pvi !== undefined && pvi >= 0) {
    idx.pv?.splice(pvi, 1);
  }

  console.log('writing');
  await indexRes.ref.set(idx);
}

async function markPuzzlePrivateUntil(
  indexRes: FirebaseFirestore.DocumentSnapshot,
  puzzleId: string,
  until: number
) {
  console.log(`attempting mark private until for ${indexRes.id}`);
  const idx = parseIndex(indexRes);
  if (idx === null) {
    return;
  }
  if (!idx.i.includes(puzzleId)) {
    console.log('puzzle not in index');
    return;
  }

  // remove from private until index if present
  if (idx.pvui?.includes(puzzleId) && idx.pvut) {
    const pvidx = idx.pvui.indexOf(puzzleId);
    console.log('splicing out ', idx.pvui.splice(pvidx, 1));
    idx.pvut.splice(pvidx, 1);
  }

  // remove from private index if present
  const pvi = idx.pv?.indexOf(puzzleId);
  if (pvi !== undefined && pvi >= 0) {
    idx.pv?.splice(pvi, 1);
  }

  if (!idx.pvui) {
    idx.pvui = [];
  }
  if (!idx.pvut) {
    idx.pvut = [];
  }
  idx.pvui.unshift(puzzleId);
  idx.pvut.unshift(AdminTimestamp.fromMillis(until));

  console.log('writing');
  await indexRes.ref.set(idx);
}

async function removeFromIndex(
  indexRes: FirebaseFirestore.DocumentSnapshot,
  puzzleId: string
) {
  console.log(`attempting delete for ${indexRes.id}`);
  const idx = parseIndex(indexRes);
  if (idx === null) {
    return;
  }
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

async function deleteNotifications(puzzleId: string) {
  const db = AdminApp.firestore();

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
}

async function deletePuzzle(puzzleId: string, dbpuz: DBPuzzleT) {
  console.log(`deleting ${puzzleId}`);
  const db = AdminApp.firestore();

  if (dbpuz.c) {
    console.error(`Can't delete for category ${dbpuz.c}`);
    return;
  }

  await deleteNotifications(puzzleId);

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

  if (before) {
    if (after.pv) {
      if (!before.pv) {
        // been marked private
        await deleteNotifications(puzzleId);

        const featuredIndexRes = await db.doc('i/featured').get();
        markPuzzlePrivate(featuredIndexRes, puzzleId);

        const authorIndexRes = await db.doc(`i/${after.a}`).get();
        markPuzzlePrivate(authorIndexRes, puzzleId);
      }
    } else if (after.pvu) {
      if (after.pvu.toMillis() !== before.pvu?.toMillis()) {
        // been marked private until
        await deleteNotifications(puzzleId);

        const featuredIndexRes = await db.doc('i/featured').get();
        markPuzzlePrivateUntil(
          featuredIndexRes,
          puzzleId,
          after.pvu.toMillis()
        );

        const authorIndexRes = await db.doc(`i/${after.a}`).get();
        markPuzzlePrivateUntil(authorIndexRes, puzzleId, after.pvu.toMillis());
      }
    } else if (before.pv || before.pvu) {
      // puzzle been made public
      const featuredIndexRes = await db.doc('i/featured').get();
      markPuzzlePublic(featuredIndexRes, puzzleId);

      const authorIndexRes = await db.doc(`i/${after.a}`).get();
      markPuzzlePublic(authorIndexRes, puzzleId);
    }
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
