#!/usr/bin/env -S npx ts-node-script

import fs from 'fs';
import util from 'util';

// eslint-disable-next-line import/no-unresolved
import { parse } from 'csv-parse/sync';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

readFile('accounts.csv').then((binary) => {
  const csv: Array<Array<string>> = parse(binary, {
    quote: null,
    escape: null,
    relax_column_count: true,
  });
  const out = csv
    .filter((r) => r[1])
    .map((r) => r[1])
    .join('\n');
  writeFile('accountsTransformed.csv', out).then(() => {
    console.log('done');
  });
});
