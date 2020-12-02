#!/usr/bin/env -S npx ts-node-script --skip-project -O '{"resolveJsonModule":true,"esModuleInterop":true}'

import fs from 'fs';
import util from 'util';

import { parse } from '../lib/ginsberg';

const readFile = util.promisify(fs.readFile);

if (process.argv.length !== 3) {
  throw Error(
    'Invalid use of parseGinsberg. Usage: ./scripts/parseGinsberg.ts [pathToCluedataFile]'
  );
}

const cluedataFilename = process.argv[2];
if (!cluedataFilename) {
  throw Error('oob');
}

console.log(`opening ${cluedataFilename}`);
readFile(cluedataFilename).then(binary => {
  parse(binary).then(() => {
    console.log('done');
  });
});