#!/usr/bin/env ts-node-script --skip-project -O {"resolveJsonModule":true,"esModuleInterop":true}

import { AdminApp } from '../lib/firebaseWrapper';
import { DBPuzzleT } from '../lib/dbtypes';
import { featuredNotification, NotificationT } from '../lib/notifications';

const db = AdminApp.firestore();

async function addNotifications() {
  const notifications: Array<NotificationT> = [];

  const puzzle = await db.doc('c/QQeUGbPKXqMFaW0e7fUD').get();
  const puzzleData = puzzle.data() as DBPuzzleT;
  notifications.push(
    featuredNotification({ ...puzzleData, id: 'QQeUGbPKXqMFaW0e7fUD' }, null)
  );

  console.log('inserting ', notifications.length);
  return Promise.all(
    notifications.map((notification) =>
      db.doc(`n/${notification.id}`).set(notification)
    )
  );
}

addNotifications().then(() => {
  console.log('Finished');
});
