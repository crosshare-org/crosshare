import * as functions from 'firebase-functions';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';

import { runAnalytics } from '../../app/lib/analytics';
import { queueEmails } from './queueEmails';
import { handlePuzzleUpdate } from '../../app/lib/puzzleUpdate';
import { doGlicko } from '../../app/lib/glicko';
import { moderateComments } from '../../app/lib/comments';
import { checkSpam } from '../../app/lib/spam';

import {
  CronStatusV,
  CronStatusT,
  CommentForModerationV,
  AdminSettingsV,
  CommentForModerationWithIdT,
  CommentDeletionV,
  CommentDeletionWithIdT,
} from '../../app/lib/dbtypes';

import {
  getCollection,
  mapEachResult,
} from '../../app/lib/firebaseAdminWrapper';
import { Timestamp } from '../../app/lib/timestamp';

export const ratings = functions
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
    if (!isRight(result)) {
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

    const filtered: CommentForModerationWithIdT[] = [];
    for (const cfm of commentsForModeration) {
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
      `done filtering, automoderating ${filtered.length} of them. Getting deletions`
    );

    const deletions: CommentDeletionWithIdT[] = await mapEachResult(
      getCollection('deleteComment'),
      CommentDeletionV,
      (cd, docId) => {
        return { ...cd, i: docId };
      }
    );

    console.log(`Got ${deletions.length} deletions`);

    await moderateComments(filtered, deletions);

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
    const data = value.data();
    if (data) {
      const result = CronStatusV.decode(data);
      if (!isRight(result)) {
        console.error(PathReporter.report(result).join(','));
        throw new Error('Malformed cron_status');
      }
      startTimestamp = result.right.ranAt;
    }
    await runAnalytics(startTimestamp, endTimestamp);
    const status: CronStatusT = { ranAt: endTimestamp };
    console.log('Done, logging analytics timestamp');
    return getCollection('cron_status').doc('hourlyanalytics').set(status);
  });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const firestore = require('@google-cloud/firestore');
const client = new firestore.v1.FirestoreAdminClient();

export const scheduledFirestoreExport = functions.pubsub
  .schedule('every day 00:00')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .onRun((_context) => {
    const projectId =
      process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'mdcrosshare';
    const databaseName = client.databasePath(projectId, '(default)');

    return (
      client
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
            'prefs',
            's', // puzzle stats
            'settings',
          ],
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((responses: any) => {
          const response = responses[0];
          console.log(`Operation Name: ${response['name']}`);
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((err: any) => {
          console.error(err);
          throw new Error('Export operation failed');
        })
    );
  });

export const notificationsSend = functions
  .runWith({ timeoutSeconds: 540 })
  .pubsub.schedule('every day 16:00')
  .onRun(async () => {
    console.log('queuing emails');
    await queueEmails();
    console.log('queued');
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
