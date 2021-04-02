#!/usr/bin/env -S npx ts-node-script --skip-project -O '{"resolveJsonModule":true,"esModuleInterop":true,"jsx":"preserve","downlevelIteration":true}'

import { getDateString } from '../lib/dbtypes';

import { AdminApp } from '../lib/firebaseWrapper';
import { getMockedPuzzle } from '../lib/getMockedPuzzle';

const db = AdminApp.firestore();

async function bootstrap() {
  const testpuz = getMockedPuzzle();
  await db.doc('c/testpuzzleid').set(testpuz);

  const res = await db.doc('categories/dailymini').get();
  if (res.exists) {
    throw new Error('running boostrap but we already have data!');
  }
  const today = getDateString(new Date());
  await db.doc('categories/dailymini').set({ [today]: 'testpuzzleid' });
}

bootstrap().then(() => {
  console.log('done');
});
