#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import {
  ConstructorStatsForPuzzleT,
  ConstructorStatsT,
  ConstructorStatsV,
} from '../lib/dbtypes';

import { getAdminApp } from '../lib/firebaseAdminWrapper';
import { getFirestore } from 'firebase-admin/firestore';
import { timeString } from '../lib/utils';

if (process.argv.length < 4) {
  throw Error(
    'Invalid use of summarizePuzzleStats. Usage: `./scripts/summarizePuzzleStats.ts USERNAME PUZZLE_ID_1 [PUZZLE_ID_2 [PUZZLE_ID_3 ...]]`'
  );
}

const db = getFirestore(getAdminApp());

const PuzzleList = (
  title: string,
  stats: ConstructorStatsT,
  filter: (x: ConstructorStatsForPuzzleT) => boolean,
  mapper: (x: ConstructorStatsForPuzzleT) => number,
  valueDisplay: ((x: number) => string) | undefined,
  sortDesc: boolean
) => {
  const matches = Object.entries(stats)
    .filter((a) => filter(a[1]))
    .map((a): [string, number] => [a[0], mapper(a[1])])
    .sort((a, b) => (sortDesc ? b[1] - a[1] : a[1] - b[1]))
    .slice(0, 5);
  if (!matches.length) return;

  console.log(title);
  matches.map((v) => {
    console.log(v[0], valueDisplay ? valueDisplay(v[1]) : v[1]);
  });
};

async function summarizeStats() {
  const cpres = await db
    .collection('cp')
    .doc(process.argv[2] || '')
    .get();
  if (!cpres.exists) {
    throw new Error('bad constructor');
  }

  const userId = cpres.data()?.u;

  const dbres = await db.collection('cs').doc(userId).get();
  if (!dbres.exists) {
    throw new Error('no constructor stats');
  }
  const validationResult = ConstructorStatsV.decode(dbres.data());
  if (!isRight(validationResult)) {
    console.error(PathReporter.report(validationResult).join(','));
    return;
  }

  const allstats = validationResult.right;
  const stats: ConstructorStatsT = {};
  for (let i = 3; i < process.argv.length; i += 1) {
    const puzId = process.argv[i] || 'error';
    const puzStats = allstats[puzId];
    if (puzStats) {
      stats[puzId] = puzStats;
    } else {
      throw new Error('no stats for puzzle: ' + puzId);
    }
  }

  console.log(
    'Total solves:',
    Object.values(stats).reduce((a, b) => a + b.n, 0)
  );
  console.log(
    'Avg solves per puzzle:',
    Math.round(
      Object.values(stats).reduce((a, b) => a + b.n, 0) /
        Object.values(stats).length
    )
  );
  console.log(
    'Avg solve time (w/o check/reveal)',
    timeString(
      Object.values(stats).reduce((a, b) => a + b.st, 0) /
        Object.values(stats).reduce((a, b) => a + b.s, 0),
      false
    )
  );

  PuzzleList(
    'Most solved puzzles',
    stats,
    (a) => a.n > 0,
    (a) => a.n,
    undefined,
    true
  );
  PuzzleList(
    'Best completion % w/o check/reveal (min 5 solves)',
    stats,
    (a) => a.n > 5,
    (a) => (100 * a.s) / a.n,
    (a) => `${Math.round(a)}%`,
    true
  );
  PuzzleList(
    'Worst completion % w/o check/reveal (min 5 solves)',
    stats,
    (a) => a.n > 5,
    (a) => (100 * a.s) / a.n,
    (a) => `${Math.round(a)}%`,
    false
  );
  PuzzleList(
    'Fastest avg. solve w/o check/reveal (min 5 solves)',
    stats,
    (a) => a.s > 5,
    (a) => a.st / a.s,
    (a) => timeString(a, false),
    false
  );
  PuzzleList(
    'Slowest avg. solve w/o check/reveal (min 5 solves)',
    stats,
    (a) => a.s > 5,
    (a) => a.st / a.s,
    (a) => timeString(a, false),
    true
  );
  PuzzleList(
    'Metas with the most submissions',
    stats,
    (a) => (a.ct_sub_n ? a.ct_sub_n > 0 : false),
    (a) => a.ct_sub_n || 0,
    undefined,
    true
  );
  PuzzleList(
    'Metas with the most % correct submissions out of total solvers',
    stats,
    (a) => (a.ct_sub_n ? a.ct_sub_n > 0 : false),
    (a) => (100 * (a.ct_sub_c || 0)) / a.n,
    (a) => `${Math.round(a)}%`,
    true
  );
  PuzzleList(
    'Metas with the lowest % correct submissions out of total solvers',
    stats,
    (a) => (a.ct_sub_n ? a.ct_sub_n > 0 : false),
    (a) => (100 * (a.ct_sub_c || 0)) / a.n,
    (a) => `${Math.round(a)}%`,
    false
  );

  return;
}
summarizeStats().then(() => {
  console.log('Done');
});
