import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

import { PathReporter } from "io-ts/lib/PathReporter";
import { isRight } from "fp-ts/lib/Either";

import { runAnalytics } from '../../app/lib/analytics';

import { CronStatusV, CronStatusT } from '../../app/lib/dbtypes';

import * as wrapper from '../../app/lib/firebaseWrapper';
wrapper.setTimestampClass(admin.firestore.Timestamp);

export const analytics = functions.pubsub.schedule('every 1 hours').onRun(async (_context) => {
  const db = admin.firestore()
  let startTimestamp = admin.firestore.Timestamp.fromDate(new Date(2020, 0));
  const endTimestamp = admin.firestore.Timestamp.now();
  const value = await db.collection("cron_status").doc('hourlyanalytics').get();
  const data = value.data();
  if (data) {
    const result = CronStatusV.decode(data);
    if (!isRight(result)) {
      console.error(PathReporter.report(result).join(","));
      throw new Error("Malformed cron_status");
    }
    startTimestamp = result.right.ranAt;
  }
  await runAnalytics(db as unknown as firebase.firestore.Firestore, startTimestamp, endTimestamp);
  const status: CronStatusT = { ranAt: endTimestamp };
  console.log("Done, logging analytics timestamp");
  return db.collection("cron_status").doc("hourlyanalytics").set(status);
});

const client = new admin.firestore.v1.FirestoreAdminClient();
export const scheduledFirestoreExport = functions.pubsub.schedule('every day 00:00').onRun((_context) => {
  const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
  const databaseName = client.databasePath(projectId, '(default)');

  return client.exportDocuments({
    name: databaseName,
    outputUriPrefix: 'gs://crosshare-backups',
    // Leave collectionIds empty to export all collections
    // or set to a list of collection IDs to export,
    // collectionIds: ['users', 'posts']
    collectionIds: []
  })
    .then((responses: any) => {
      const response = responses[0];
      console.log(`Operation Name: ${response['name']}`);
    })
    .catch((err: any) => {
      console.error(err);
      throw new Error('Export operation failed');
    });
});
