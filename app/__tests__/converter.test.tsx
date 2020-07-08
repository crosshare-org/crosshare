import cases from 'jest-in-case';
import fs from 'fs';
import util from 'util';
import path from 'path';

import { importFile } from '../lib/converter';

const readFile = util.promisify(fs.readFile);

async function loadPuz(name: string) {
  const puz = await readFile(path.resolve(__dirname, 'converter/puz/' + name + '.puz'));
  return importFile(puz);
}

test('test error on locked', async () => {
  await expect(loadPuz('nyt_locked')).rejects.toThrowErrorMatchingSnapshot();
});

cases('test .puz import', async opts => {
  expect(await loadPuz(opts.name)).toMatchSnapshot();
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
