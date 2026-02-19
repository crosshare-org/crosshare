import { DBPuzzleT, DBPuzzleV } from './dbtypes.js';
import { getCollection, toFirestore } from './firebaseAdminWrapper.js';
import {
  NotificationT,
  NotificationV,
  isNewPuzzleNotification,
} from './notificationTypes.js';
import { notificationsForPuzzleChange } from './notifications.js';
import { PathReporter } from './pathReporter.js';
import { isUserPatron } from './patron.js';
import { sizeTag } from './sizeTag.js';
import { Timestamp } from './timestamp.js';
import { buildTagIndex, eqSet } from './utils.js';

async function deleteNotifications(
  puzzleId: string,
  shouldDelete?: (n: NotificationT) => boolean
) {
  console.log('deleting notifications');
  await getCollection('n')
    .where('p', '==', puzzleId)
    .get()
    .then((snap) => {
      return Promise.all(
        snap.docs.map(async (res) => {
          const n = NotificationV.decode(res.data());
          if (!shouldDelete || n._tag !== 'Right' || shouldDelete(n.right)) {
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
  console.log('updating notifications');
  await getCollection('n')
    .where('p', '==', puzzleId)
    .get()
    .then((snap) => {
      return Promise.all(
        snap.docs.map(async (res) => {
          const n = NotificationV.decode(res.data());
          if (n._tag === 'Right') {
            const toUpdate = update(n.right);
            if (toUpdate) {
              console.log('updating notification');
              await res.ref.update(toFirestore(toUpdate));
            }
          }
        })
      );
    });
}

async function deletePuzzle(puzzleId: string, dbpuz: DBPuzzleT) {
  console.log(`deleting ${puzzleId}`);
  if (dbpuz.dmd) {
    console.error(`Can't delete daily mini`);
    return;
  }

  await deleteNotifications(puzzleId);

  console.log('deleting plays');
  await getCollection('p')
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
  await getCollection('c').doc(puzzleId).delete();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePuzzle(docdata: any): DBPuzzleT | null {
  const validationResult = DBPuzzleV.decode(docdata);
  if (validationResult._tag === 'Right') {
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
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
  let doUpdate = false;
  const update: { tg_a?: string[]; tg_i?: string[] } = {};

  const autoTags = autoTag(dbpuz);
  if (!eqSet(new Set(autoTags), new Set(dbpuz.tg_a))) {
    doUpdate = true;
    update.tg_a = autoTags;
  }

  const tagIndex = buildTagIndex(dbpuz.tg_u, autoTags);
  if (!eqSet(new Set(tagIndex), new Set(dbpuz.tg_i))) {
    doUpdate = true;
    update.tg_i = tagIndex;
  }

  if (doUpdate) {
    await getCollection('c').doc(puzzleId).update(update);
  }
}

const RFM_TIME_LIMIT = 1000 * 60 * 60 * 36;
/* Check if a puzzle is "ready for moderation".
 *
 * For right now this means it has comments enabled, was published in the last
 * 36hrs, and (a) has any (non-author) comments or (b) has any likes, or
 * (c) was constructed by a patron. */
async function updateRfmIfNeeded(puzzleId: string, dbpuz: DBPuzzleT) {
  // Don't set rfm if puzzle has comments disabled or is already moderated
  if (dbpuz.no_cs || dbpuz.rfm || dbpuz.m) {
    return;
  }
  // Don't set for private puzzles
  if (dbpuz.pv !== false && dbpuz.pv !== undefined) {
    return;
  }
  // Don't set if it's been public for longer than 36 hrs already
  if (Timestamp.now().toMillis() > dbpuz.pvu.toMillis() + RFM_TIME_LIMIT) {
    return;
  }
  if (
    dbpuz.cs?.filter((c) => c.a !== dbpuz.a).length ||
    dbpuz.lk?.length ||
    (await isUserPatron(dbpuz.a))
  ) {
    await getCollection('c').doc(puzzleId).update({ rfm: true });
  }
}

export async function handlePuzzleUpdate(
  beforeData: FirebaseFirestore.DocumentData | undefined,
  afterData: FirebaseFirestore.DocumentData | undefined,
  puzzleId: string
): Promise<void> {
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

  await updateTagsIfNeeded(puzzleId, after);

  if (before) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (after.pv) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!before.pv) {
        // been marked private
        await deleteNotifications(puzzleId, isNewPuzzleNotification);
      }
    } else {
      if (after.pvu.toMillis() !== before.pvu?.toMillis()) {
        // been marked private until or updated privateUntil
        await updateNotifications(puzzleId, (n) => {
          if (isNewPuzzleNotification(n)) {
            return { t: Timestamp.fromMillis(after.pvu.toMillis()) };
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
    await getCollection('n').doc(notification.id).set(notification);
  }
  console.log(`Created ${notifications.length} notifications`);

  await updateRfmIfNeeded(puzzleId, after);
}
