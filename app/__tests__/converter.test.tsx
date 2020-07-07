import cases from 'jest-in-case';
import fs from 'fs';
import util from 'util';
import path from 'path';

import { importFile } from '../lib/converter';

const readFile = util.promisify(fs.readFile);


cases('test .puz import', async opts => {
  const puz = await readFile(path.resolve(__dirname, 'converter/puz/' + opts.name + '.puz'));
  expect(importFile(puz)).toMatchSnapshot();
},
[
  { name: 'av110622' },
  { name: 'cs080904' },
  { name: 'Feb0308_oddnumbering' },
  { name: 'nyt_partlyfilled' },
  { name: 'nyt_rebus_with_notes_and_shape' },
  { name: 'nyt_with_shape' },
  { name: 'washpost' },
  { name: 'wsj110624' },
]
);
