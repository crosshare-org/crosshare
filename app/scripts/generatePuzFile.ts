#!/usr/bin/env -S npx ts-node-script --skip-project -O '{"resolveJsonModule":true,"esModuleInterop":true,"downlevelIteration":true,"noUncheckedIndexedAccess":true,"strict":true}'

import fs from 'fs';
import util from 'util';

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { DBPuzzleV } from '../lib/dbtypes';

import { AdminApp } from '../lib/firebaseWrapper';
import { exportFile } from '../lib/converter';

if (process.argv.length !== 3) {
  throw Error(
    'Invalid use of generatePuzFile. Usage: ./scripts/generatePuzFile.ts [puzzleId]'
  );
}

const db = AdminApp.firestore();

async function generatePuzFile() {
  console.log(`generating for ${process.argv[2]}`);
  const dbres = await db.doc(`c/${process.argv[2]}`).get();
  if (!dbres.exists) {
    console.error('no such puzzle');
    return;
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (!isRight(validationResult)) {
    console.error(PathReporter.report(validationResult).join(','));
    return;
  }
  const dbpuz = validationResult.right;
  const puzFile = exportFile(dbpuz);
  const writeFile = util.promisify(fs.writeFile);
  const filename = `${dbpuz.t}.puz`;
  return writeFile(filename, puzFile).then(() => {
    console.log(`wrote ${filename}`);
  });
}

generatePuzFile().then(() => {
  console.log('Done');
});
