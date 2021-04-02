#!/usr/bin/env -S npx ts-node-script --skip-project -O '{"resolveJsonModule":true,"esModuleInterop":true,"jsx":"preserve","downlevelIteration":true}'

import { getDateString } from '../lib/dbtypes';

import { AdminApp } from '../lib/firebaseWrapper';
import { getMockedPuzzle } from '../lib/testingUtils';

const db = AdminApp.firestore();

const testpuz = getMockedPuzzle();
await db.doc('c/testpuzzleid').set(testpuz);

const today = getDateString(new Date());
await db.doc('categories/dailymini').set({ [today]: 'testpuzzleid' });

console.log('done');
