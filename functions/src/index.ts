import firestore from '@google-cloud/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import { runAnalytics } from '../../app/lib/analytics.js';
import { moderateComments } from '../../app/lib/comments.js';
import { validate } from '../../app/lib/constructorPage.js';
import {
  AdminSettingsV,
  CommentDeletionV,
  CommentDeletionWithIdT,
  CommentForModerationV,
  CommentForModerationWithIdT,
  CronStatusT,
  CronStatusV,
} from '../../app/lib/dbtypes.js';
import {
  getCollection,
  mapEachResult,
} from '../../app/lib/firebaseAdminWrapper.js';
import { doGlicko } from '../../app/lib/glicko.js';
import { cleanNotifications } from '../../app/lib/notifications.js';
import { PathReporter } from '../../app/lib/pathReporter.js';
import { handlePuzzleUpdate } from '../../app/lib/puzzleUpdate.js';
import { ReactionT, ReactionV } from '../../app/lib/reactions.js';
import { checkSpam } from '../../app/lib/spam.js';
import { Timestamp } from '../../app/lib/timestamp.js';
import { queueEmails } from './queueEmails.js';

export const ratings = functions
  // eslint-disable-next-line import/namespace
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('every day 00:05')
  .timeZone('UTC')
  .onRun(async (_context) => {
    await doGlicko();
    return;
  });

export const autoModerator = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (_context) => {
    console.log('running automoderator');
    const settingsDoc = await getCollection('settings').doc('settings').get();
    const result = AdminSettingsV.decode(settingsDoc.data());
    if (result._tag !== 'Right') {
      console.error(PathReporter.report(result).join(','));
      throw new Error('Malformed admin settings');
    }
    const settings = result.right;

    if (!settings.automoderate) {
      console.log('automoderation is turned off, done');
      return;
    }

    console.log('getting cfms');
    const commentsForModeration = await mapEachResult(
      getCollection('cfm'),
      CommentForModerationV,
      (cfm, docId) => {
        return { ...cfm, i: docId };
      }
    );
    console.log(`Got ${commentsForModeration.length} cfms`);

    const deletions: CommentDeletionWithIdT[] = await mapEachResult(
      getCollection('deleteComment'),
      CommentDeletionV,
      (cd, docId) => {
        return { ...cd, i: docId };
      }
    );
    console.log(`Got ${deletions.length} deletions`);

    const filtered: CommentForModerationWithIdT[] = [];
    for (const cfm of commentsForModeration) {
      // If it's been deleted already then mark it as such and automod it (even if it has needsModeration set!)
      const del = deletions.find(
        (del) => del.pid === cfm.pid && del.cid === cfm.i && del.a === cfm.a
      );
      if (del) {
        cfm.deleted = true;
        cfm.rejected = cfm.rejected || del.removed;
        filtered.push(cfm);
        continue;
      }

      // If it's been approved or rejected already then we can automod it
      if (cfm.approved || cfm.rejected) {
        filtered.push(cfm);
        continue;
      }
      // We've already automodded it and it needs approval
      if (cfm.needsModeration) {
        continue;
      }
      // Check if we need to send it off for manual moderation
      if (settings.noAuto.includes(cfm.a) || checkSpam(cfm.c)) {
        await getCollection('cfm').doc(cfm.i).update({ needsModeration: true });
        continue;
      }
      // Otherwise we are good to automod it
      filtered.push(cfm);
    }

    console.log(
      `done filtering, automoderating ${filtered.length} of them. Getting reactions`
    );

    const reactions: ReactionT[] = await mapEachResult(
      getCollection('reaction'),
      ReactionV,
      (r) => r
    );

    console.log(`got ${reactions.length} reactions`);

    await moderateComments(filtered, deletions, reactions);

    console.log('done');
    return;
  });

export const analytics = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (_context) => {
    let startTimestamp = Timestamp.fromDate(new Date(2020, 0));
    const endTimestamp = Timestamp.now();
    const value = await getCollection('cron_status')
      .doc('hourlyanalytics')
      .get();
    const result = CronStatusV.decode(value.data());
    if (result._tag !== 'Right') {
      console.error(PathReporter.report(result).join(','));
      throw new Error('Malformed cron_status');
    }
    startTimestamp = result.right.ranAt;

    await runAnalytics(startTimestamp, endTimestamp);
    const status: CronStatusT = { ranAt: endTimestamp };
    console.log('Done, logging analytics timestamp');
    return getCollection('cron_status').doc('hourlyanalytics').set(status);
  });

const client = new firestore.v1.FirestoreAdminClient();

export const scheduledFirestoreExport = functions.pubsub
  .schedule('every day 00:00')

  .onRun((_context) => {
    const projectId =
      process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'mdcrosshare';
    const databaseName = client.databasePath(projectId, '(default)');

    // The prefs collection is overwhelmingly the largest mostly due to
    // generating a record for every anonymous solver as part of the glicko
    // process. Only save it weekly to cut back on costs.
    const savePrefs = new Date().getDay() === 5;

    return client
      .exportDocuments({
        name: databaseName,
        outputUriPrefix: 'gs://crosshare-backups',
        // Leave collectionIds empty to export all collections
        // or set to a list of collection IDs to export,
        // collectionIds: ['users', 'posts']
        collectionIds: [
          'a', // articles
          'c', // puzzles
          'cp', // blogs
          'cs', // constructor stats
          'donations',
          'ds', // daily stats
          'em', // embed settings
          'followers',
          ...(savePrefs ? ['prefs'] : []),
          's', // puzzle stats
          'settings',
        ],
      })
      .then((responses) => {
        const response = responses[0];
        console.log(`Operation Name: ${response.name}`);
      })
      .catch((err: unknown) => {
        console.error(err);
        throw new Error('Export operation failed');
      });
  });

export const notificationsSend = functions
  // eslint-disable-next-line import/namespace
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('every day 16:00')
  .onRun(async () => {
    console.log('queuing emails');
    await queueEmails();
    console.log('done, cleaning old');
    await cleanNotifications();
    console.log('done');
  });

export const puzzleUpdate = functions.firestore
  .document('c/{puzzleId}')
  .onWrite(async (change) => {
    if (!change.after.exists) {
      return;
    }
    console.log('Puzzle written, checking for notifications');
    const newValue = change.after.data();
    const previousValue = change.before.data();
    await handlePuzzleUpdate(previousValue, newValue, change.after.id);
  });

export const constructorPageUpdate = functions.firestore
  .document('cp/{pageId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) {
      const previousValue = validate(
        change.before.data(),
        context.params.pageId
      );
      if (!previousValue) {
        console.error(
          'Deleting constructor page but no valid prev value',
          context.params.pageId
        );
        return;
      }
      console.log(`Deleted page ${context.params.pageId}, removing from cache`);
      await getCollection('cache')
        .doc('barebonesConstructorPages')
        .update({ [previousValue.u]: FieldValue.delete() });
      return;
    } else {
      const newValue = validate(change.after.data(), context.params.pageId);
      if (!newValue) {
        console.error(
          'Updating constructor page but no valid new value',
          context.params.pageId
        );
        return;
      }
      console.log(
        `Constructor page ${context.params.pageId} written, updating barebones cache`
      );
      await getCollection('cache')
        .doc('barebonesConstructorPages')
        .set(
          { [newValue.u]: { i: newValue.i, n: newValue.n } },
          { merge: true }
        );
    }
  });

export const userDeletion = functions.auth.user().onDelete(async (user) => {
  // Only non anonymous users have these
  if (user.email) {
    console.log('deleting puzzles for', user.email, user.uid);
    await Promise.all(
      (await getCollection('c').where('a', '==', user.uid).get()).docs.map(
        (doc) => doc.ref.update({ del: true })
      )
    );

    console.log('deleting cp for', user.email, user.uid);
    await getCollection('cp')
      .where('u', '==', user.uid)
      .limit(1)
      .get()
      .then((r) => r.docs[0]?.ref.delete());

    console.log('deleting cs for', user.email, user.uid);
    await getCollection('cs').doc(user.uid).delete();

    console.log('deleting em for', user.email, user.uid);
    await getCollection('em').doc(user.uid).delete();

    console.log('deleting followers for', user.email, user.uid);
    await getCollection('followers').doc(user.uid).delete();
  }

  console.log('deleting prefs for', user.email, user.uid);
  await getCollection('prefs').doc(user.uid).delete();

  console.log('deleting plays for', user.email, user.uid);
  await Promise.all(
    (await getCollection('p').where('u', '==', user.uid).get()).docs.map(
      (doc) => doc.ref.delete()
    )
  );
});
