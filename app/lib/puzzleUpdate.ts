import { getFirestore } from 'firebase-admin/firestore';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AdminApp, AdminTimestamp } from '../lib/firebaseAdminWrapper';
import { DBPuzzleT, DBPuzzleV } from './dbtypes';
import { notificationsForPuzzleChange } from './notifications';
import {
  isNewPuzzleNotification,
  NotificationT,
  NotificationV,
} from './notificationTypes';
import { buildTagIndex, eqSet } from './utils';

async function deleteNotifications(
  puzzleId: string,
  shouldDelete?: (n: NotificationT) => boolean
) {
  const db = getFirestore(AdminApp);

  console.log('deleting notifications');
  await db
    .collection('n')
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

async function updateNotifications(
  puzzleId: string,
  update: (n: NotificationT) => Partial<NotificationT> | null
) {
  const db = getFirestore(AdminApp);

  console.log('updating notifications');
  await db
    .collection('n')
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
        })
      );
    });
}

async function deletePuzzle(puzzleId: string, dbpuz: DBPuzzleT) {
  console.log(`deleting ${puzzleId}`);
  const db = getFirestore(AdminApp);

  if (dbpuz.dmd) {
    console.error(`Can't delete daily mini`);
    return;
  }

  await deleteNotifications(puzzleId);

  console.log('deleting plays');
  await db
    .collection('p')
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

export function sizeTag(size: number): string {
  if (size < 50) {
    return 'mini';
  } else if (size < 12 * 12) {
    return 'midi';
  } else if (size < 17 * 17) {
    return 'full';
  } else {
    return 'jumbo';
  }
}

function autoTag(p: DBPuzzleT) {
  const auto = [sizeTag(p.w * p.h - (p.hdn?.length || 0))];

  if (p.tg_f?.length) {
    auto.push(...p.tg_f);
  }

  if (p.ct_ans?.length) {
    auto.push('meta');
  }

  if (p.f) {
    auto.push('featured');
  }

  if (p.dmd) {
    auto.push('dailymini');
  }

  if (p.rtg && p.rtg.d < 200) {
    if (p.rtg.r < 1200) {
      auto.push('rating-0-1200');
    } else if (p.rtg.r < 1500) {
      auto.push('rating-1200-1500');
    } else if (p.rtg.r < 1800) {
      auto.push('rating-1500-1800');
    } else {
      auto.push('rating-1800-up');
    }
  }

  return auto;
}

async function updateTagsIfNeeded(puzzleId: string, dbpuz: DBPuzzleT) {
  const db = getFirestore(AdminApp);

  let doUpdate = false;
  const update: { tg_a?: string[]; tg_i?: string[] } = {};

  const autoTags = autoTag(dbpuz);
  if (!eqSet(new Set(autoTags), new Set(dbpuz.tg_a))) {
    doUpdate = true;
    update['tg_a'] = autoTags;
  }

  const tagIndex = buildTagIndex(dbpuz.tg_u, autoTags);
  if (!eqSet(new Set(tagIndex), new Set(dbpuz.tg_i))) {
    doUpdate = true;
    update['tg_i'] = tagIndex;
  }

  if (doUpdate) {
    await db.collection('c').doc(puzzleId).update(update);
  }
}

export async function handlePuzzleUpdate(
  beforeData: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  afterData: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  puzzleId: string
): Promise<void> {
  const db = getFirestore(AdminApp);

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

  updateTagsIfNeeded(puzzleId, after);

  if (before) {
    if (after.pv) {
      if (!before.pv) {
        // been marked private
        await deleteNotifications(puzzleId, isNewPuzzleNotification);
      }
    } else {
      if (after.pvu.toMillis() !== before.pvu?.toMillis()) {
        // been marked private until or updated privateUntil
        await updateNotifications(puzzleId, (n) => {
          if (isNewPuzzleNotification(n)) {
            return { t: AdminTimestamp.fromMillis(after.pvu.toMillis()) };
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
