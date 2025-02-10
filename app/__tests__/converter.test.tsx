import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';
import cases from 'jest-in-case';
import { exportFile, importFile } from '../lib/converter.js';
import { DBPuzzleT } from '../lib/dbtypes.js';
import { Timestamp } from '../lib/timestamp.js';
import { PuzzleInProgressStrictT } from '../lib/types.js';
import { fromCells } from '../lib/viewableGrid.js';
import { getClueProps } from '../reducers/builderReducer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = util.promisify(fs.readFile);

async function loadPuz(name: string) {
  const puz = await readFile(
    path.resolve(__dirname, 'converter/puz/' + name + '.puz')
  );
  return importFile(puz);
}

function toDBPuzzle(pip: PuzzleInProgressStrictT): DBPuzzleT {
  const grid = fromCells({
    mapper: (e) => e,
    width: pip.width,
    height: pip.height,
    cells: pip.grid,
    allowBlockEditing: false,
    hidden: new Set(pip.hidden),
    highlighted: new Set(pip.highlighted),
    highlight: pip.highlight,
    hBars: new Set(pip.hBars || []),
    vBars: new Set(pip.vBars || []),
  });
  const puzzle: DBPuzzleT = {
    t: pip.title || 'Anonymous',
    a: 'Author Id',
    n: 'Author Name',
    m: false,
    p: Timestamp.now(),
    c: null,
    h: pip.height,
    w: pip.width,
    g: pip.grid,
    pv: true,
    hdn: pip.hidden,
    ...getClueProps(grid.sortedEntries, grid.entries, pip.clues, true),
    ...(pip.notes && { cn: pip.notes }),
  };
  if (pip.highlighted.length) {
    puzzle.hs = Array.from(pip.highlighted);
    if (pip.highlight === 'shade') {
      puzzle.s = true;
    }
  }
  return puzzle;
}

test('test error on locked', async () => {
  await expect(loadPuz('nyt_locked')).rejects.toThrowErrorMatchingSnapshot();
});

test('test error on copyright', async () => {
  await expect(
    loadPuz('nyt_with_copyright')
  ).rejects.toThrowErrorMatchingSnapshot();
});

const CASES = [
  { name: '2016-1-5-JosephCrosswords' },
  { name: '2016-1-5-ShefferCrosswords' },
  { name: '2016-1-5-UniversalCrossword' },
  { name: '2016-1-5-USAToday' },
  { name: '2016-1-31-LosAngelesTimes' },
  { name: '2016-1-31-Newsday' },
  { name: 'av110622' },
  { name: 'cs080904' },
  { name: 'Feb0308_oddnumbering' },
  { name: 'FamilyCrossword' },
  { name: 'hobbyistspam' },
  { name: 'nyt_partlyfilled' },
  { name: 'nyt_rebus_with_notes_and_shape' },
  { name: 'nyt_with_shape' },
  { name: 'puz_131202banks' },
  { name: 'version-1.2-puzzle-with-notes' },
  { name: 'version-1.2-puzzle' },
  { name: 'qvxdupes' },
  { name: 'washpost' },
  { name: 'wsj110624' },
  { name: 'incognito' },
  { name: 'Its_All_Wrong' },
];

cases(
  'test roundtrip',
  async (opts) => {
    const puz = await readFile(
      path.resolve(__dirname, 'converter/puz/' + opts.name + '.puz')
    );
    const pip = importFile(puz);
    if (!pip) {
      throw new Error('failed to import');
    }
    const ourPuz = exportFile(toDBPuzzle(pip));
    expect(importFile(ourPuz)).toEqual(pip);
    expect(ourPuz).toMatchSnapshot();
  },
  CASES
);

cases(
  'test .puz import',
  async (opts) => {
    const loaded = await loadPuz(opts.name);
    if (!loaded) {
      throw new Error('BAD');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const simplifiedClues = Object.fromEntries(
      Object.entries(loaded.clues).map(([entry, clues]) =>
        clues.length === 1 && clues[0] ? [entry, clues[0]] : [entry, clues]
      )
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect({ ...loaded, clues: simplifiedClues }).toMatchSnapshot();
  },
  CASES
);
