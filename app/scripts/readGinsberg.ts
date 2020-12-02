#!/usr/bin/env -S npx ts-node-script --skip-project -O '{"resolveJsonModule":true,"esModuleInterop":true}'

import { getDB, getClues } from '../lib/ginsberg';

if (process.argv.length !== 3) {
  throw Error(
    'Invalid use of readGinsberg. Usage: ./scripts/readGinsberg.ts [wordToLookup]'
  );
}

const word = process.argv[2];
if (!word) {
  throw Error('oob');
}

const db = getDB();
getClues(db, word).then(c => {
  console.log(JSON.stringify(c, null, 2));
});