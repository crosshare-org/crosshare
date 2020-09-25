#!/usr/bin/env ts-node-script --skip-project -O {"resolveJsonModule":true}

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { getDateString, DailyStatsV } from '../lib/dbtypes';

import { AdminApp } from '../lib/firebaseWrapper';

if (process.argv.length !== 2) {
  throw Error('Invalid use of generateWeeklyEmail. Usage: ./scripts/generateWeeklyEmail.ts');
}

const db = AdminApp.firestore();

function sumOnto(a: Record<string, number>, b: Record<string, number> | undefined) {
  if (!b) {
    return;
  }
  for (const k of Object.keys(b)) {
    a[k] = (a[k] || 0) + b[k];
  }
}

function replaceOnto<T>(a: Record<string, T>, b: Record<string, T> | undefined) {
  if (!b) {
    return;
  }
  Object.assign(a, b);
}

async function topPuzzlesForWeek(): Promise<Array<[string, string]>> {
  const totalC: Record<string, number> = {};
  const allIs: Record<string, [string, string, string]> = {};
  const d = new Date();
  for (let i = 0; i < 7; i += 1) {
    d.setDate(d.getDate() - 1);
    const dateString = getDateString(d);
    console.log(dateString);
    const dbres = await db.collection('ds').doc(dateString).get();
    if (!dbres.exists) {
      continue;
    }
    const validationResult = DailyStatsV.decode(dbres.data());
    if (isRight(validationResult)) {
      sumOnto(totalC, validationResult.right.c);
      replaceOnto(allIs, validationResult.right.i);
    } else {
      console.error(PathReporter.report(validationResult).join(','));
    }
  }
  return Object.entries(totalC).sort((a, b) => b[1] - a[1]).slice(0, 5).filter(([id]) => allIs[id]).map(([id]): [string, string] =>
    ['https://crosshare.org/crosswords/' + id, allIs[id][0] + ' by ' + allIs[id][1]]
  );
}

async function generateWeeklyEmail() {
  const topForWeek = await topPuzzlesForWeek();
  console.log('<strong>Top puzzles this week:</strong><br />');
  topForWeek.forEach(([link, text]) => {
    console.log('<a href="' + link + '">' + text + '</a><br />');
  });
}

generateWeeklyEmail().then(() => {
  console.log('Finished generation');
});
