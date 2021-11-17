import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AdminApp, AdminTimestamp } from '../lib/firebaseWrapper';
import { DBPuzzleT, DBPuzzleV } from './dbtypes';
import { isNewPuzzleNotification, notificationsForPuzzleChange, NotificationT, NotificationV } from './notifications';

async function deleteNotifications(puzzleId: string, shouldDelete?: (n: NotificationT) => boolean) {
  const db = AdminApp.firestore();

  console.log('deleting notifications');
  await db.collection('n')
    .where('p', '==', puzzleId)
    .get()
    .then((snap) => {
      return Promise.all(
        snap.docs.map(async (res) => {
          const n = NotificationV.decode(res.data());
          if (!shouldDelete || !isRight(n) || shouldDelete(n.right)) {
            console.log('deleting notification');
            await res.ref.delete();
          }
        })
      );
    });
}

async function updateNotifications(puzzleId: string, update: (n: NotificationT) => Partial<NotificationT> | null) {
  const db = AdminApp.firestore();

  console.log('updating notifications');
  await db.collection('n')
    .where('p', '==', puzzleId)
    .get()
    .then((snap) => {
      return Promise.all(
        snap.docs.map(async (res) => {
          const n = NotificationV.decode(res.data());
          if (isRight(n)) {
            const toUpdate = update(n.right);
            if (toUpdate) {
              console.log('updating notification');
              await res.ref.update(toUpdate);
            }
          }
        }));
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
  await db.collection('p')
    .where('c', '==', puzzleId)
    .get()
    .then((snap) => {
      return Promise.all(
        snap.docs.map(async (res) => {
          console.log('deleting play');
          await res.ref.delete();
        })
      );
    });

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
        await deleteNotifications(puzzleId, isNewPuzzleNotification);
      }
    } else {
      if (after.pvu.toMillis() !== before.pvu?.toMillis()) {
        // been marked private until or updated privateUntil
        await updateNotifications(puzzleId, n => {
          if (isNewPuzzleNotification(n)) {
            return {t: AdminTimestamp.fromMillis(after.pvu.toMillis())};
          }
          return null;
        });
      }
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
