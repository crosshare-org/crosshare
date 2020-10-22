#!/usr/bin/env ts-node-script --skip-project -O {"resolveJsonModule":true,"esModuleInterop":true}

import { AdminApp } from '../lib/firebaseWrapper';
import { DBPuzzleT } from '../lib/dbtypes';
import { newPuzzleNotification, NotificationT } from '../lib/notifications';

const db = AdminApp.firestore();

async function addNotifications() {
  const notifications: Array<NotificationT> = [];

  const puzzle = await db.doc('c/QQeUGbPKXqMFaW0e7fUD').get();
  const puzzleData = puzzle.data() as DBPuzzleT;
  notifications.push(newPuzzleNotification({ ...puzzleData, id: 'QQeUGbPKXqMFaW0e7fUD' }, 'fSEwJorvqOMK5UhNMHa4mu48izl1'));

  const puzzle2 = await db.doc('c/LciqfPNd5yJRSpk1elwo').get();
  const puzzleData2 = puzzle2.data() as DBPuzzleT;
  notifications.push(newPuzzleNotification({ ...puzzleData2, id: 'LciqfPNd5yJRSpk1elwo' }, 'fSEwJorvqOMK5UhNMHa4mu48izl1'));

  console.log('inserting ', notifications.length);
  return Promise.all(notifications.map(notification => db.doc(`n/${notification.id}`).set(notification)));
}

addNotifications().then(() => {
  console.log('Finished');
});
