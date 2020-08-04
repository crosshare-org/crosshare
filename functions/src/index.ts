import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

import { PathReporter } from "io-ts/lib/PathReporter";
import { isRight } from "fp-ts/lib/Either";

import {
  PlayV, PuzzleStatsT, PuzzleStatsV, DailyStatsV, DailyStatsT,
  DBPuzzleV, CronStatusV, CronStatusT, getDateString,
} from '../../app/lib/dbtypes';

import * as wrapper from '../../app/lib/firebaseWrapper';
wrapper.setTimestampClass(admin.firestore.Timestamp);

async function runAnalytics(startTimestamp: admin.firestore.Timestamp, endTimestamp: admin.firestore.Timestamp) {
  console.log("Updating analytics btwn", startTimestamp.toDate().toLocaleString(), endTimestamp.toDate().toLocaleString());
  const db = admin.firestore()
  const value = await db.collection('p').where('f', '==', true)
    .where('ua', '>=', startTimestamp)
    .where('ua', '<', endTimestamp)
    .orderBy('ua', 'asc').get();
  console.log("Updating analytics for " + value.size + " plays");

  const puzzleStatsMap: Map<string, PuzzleStatsT> = new Map();
  const dailyStatsMap: Map<string, DailyStatsT> = new Map();

  for (const doc of value.docs) {
    const validationResult = PlayV.decode(doc.data());
    if (!isRight(validationResult)) {
      console.error(PathReporter.report(validationResult).join(","));
      throw new Error("Malformed play");
    }
    const play = validationResult.right;

    // First make sure we have a puzzle stats obj in the cache for the relevant puzzle
    let puzzleStats = puzzleStatsMap.get(play.c);
    if (!puzzleStats) {
      // get puzzle stats from db or create a new stats object
      const psvalue = await db.collection('s').doc(play.c).get();
      if (psvalue.exists) {
        const result = PuzzleStatsV.decode(psvalue.data());
        if (!isRight(result)) {
          console.error(PathReporter.report(result).join(","));
          throw new Error("Malformed puzzle stats");
        }
        puzzleStats = result.right;
        puzzleStatsMap.set(play.c, puzzleStats);
      } else {
        // one add'l query to get authorId, which we need for security rules for stats
        const puzzle = await db.collection('c').doc(play.c).get();
        if (!puzzle.exists) {
          throw new Error("Missing puzzle but have play: " + play.c);
        }
        const dbpuzzle = DBPuzzleV.decode(puzzle.data());
        if (!isRight(dbpuzzle)) {
          console.error(PathReporter.report(dbpuzzle).join(","));
          throw new Error("Malformed puzzle");
        }
        puzzleStats = {
          a: dbpuzzle.right.a,
          ua: endTimestamp,
          n: 0,
          s: 0,
          nt: 0,
          st: 0,
          ct: [],
          uc: [],
        }
        puzzleStatsMap.set(play.c, puzzleStats);
      }
    }

    // don't count the author's play in puzzle stats
    if (puzzleStats.a === play.u) {
      continue;
    }

    puzzleStats.ua = endTimestamp;
    puzzleStats.n += 1;
    puzzleStats.nt += play.t;
    if (!play.ch) {
      puzzleStats.s += 1;
      puzzleStats.st += play.t;
    }
    for (let i = 0; i < play.ct.length; i += 1) {
      let updateTime = play.ct[i];
      const updateIters = play.uc[i];
      if (play.rc.indexOf(i) !== -1 || play.we.indexOf(i) !== -1) {
        /* If a cell was revealed or checked & wrong, make it's update time the
         * end of the play. This way cheat cells always show as taking the
         * longest for the user in question. */
        updateTime = play.t;
      }
      puzzleStats.ct[i] = (puzzleStats.ct[i] || 0) + updateTime;
      puzzleStats.uc[i] = (puzzleStats.uc[i] || 0) + updateIters;
    }

    // Next update daily stats for the relevant date
    const pd = play.ua.toDate();
    const dateString = getDateString(pd);
    let dailyStats = dailyStatsMap.get(dateString);
    if (!dailyStats) {
      // get daily stats from db or create a new stats object
      const dsvalue = await db.collection('ds').doc(dateString).get();
      if (dsvalue.exists) {
        const result = DailyStatsV.decode(dsvalue.data());
        if (!isRight(result)) {
          console.error(PathReporter.report(result).join(","));
          throw new Error("Malformed daily stats");
        }
        dailyStats = result.right;
        dailyStatsMap.set(dateString, dailyStats);
      } else {
        dailyStats = {
          ua: endTimestamp,
          n: 0,
          u: [],
          c: {},
          h: Array<number>(24).fill(0),
        }
        dailyStatsMap.set(dateString, dailyStats);
      }
    }
    dailyStats.ua = endTimestamp;
    dailyStats.n += 1;
    if (dailyStats.u.indexOf(play.u) === -1) {
      dailyStats.u.push(play.u);
    }
    dailyStats.c[play.c] = (dailyStats.c[play.c] || 0) + 1;
    const hour = pd.getUTCHours();
    dailyStats.h[hour] = (dailyStats.h[hour] || 0) + 1;
  }

  console.log("Done, writing " + puzzleStatsMap.size + " puzzle stats objects");
  for (const [crosswordId, puzzleStats] of puzzleStatsMap.entries()) {
    await db.collection('s').doc(crosswordId).set(puzzleStats);
  }
  console.log("Writing " + dailyStatsMap.size + " daily stats objects");
  for (const [dateString, dailyStats] of dailyStatsMap.entries()) {
    await db.collection('ds').doc(dateString).set(dailyStats);
  }
}

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
  await runAnalytics(startTimestamp, endTimestamp);
  const status: CronStatusT = { ranAt: endTimestamp };
  console.log("Done, logging analytics timestamp");
  return db.collection("cron_status").doc("hourlyanalytics").set(status);
});

const client = new admin.firestore.v1.FirestoreAdminClient();
export const scheduledFirestoreExport = functions.pubsub.schedule('every day 03:00').onRun((_context) => {
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
