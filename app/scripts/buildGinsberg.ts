#!/usr/bin/env -S npx ts-node-script --skip-project -O '{"resolveJsonModule":true,"esModuleInterop":true}'

import fs from 'fs';
import util from 'util';

import { build } from '../lib/ginsberg';

const readFile = util.promisify(fs.readFile);

if (process.argv.length !== 3) {
  throw Error(
    'Invalid use of buildGinsberg. Usage: ./scripts/buildGinsberg.ts [pathToCluedataFile]'
  );
}

const cluedataFilename = process.argv[2];
if (!cluedataFilename) {
  throw Error('oob');
}

console.log(`opening ${cluedataFilename}`);
readFile(cluedataFilename).then(binary => {
  build(binary).then(() => {
    console.log('done');
  });
});