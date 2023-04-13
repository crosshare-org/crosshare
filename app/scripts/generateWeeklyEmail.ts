#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script

import fs from 'fs';
import util from 'util';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import {
  getDateString,
  DailyStatsV,
  DBPuzzleT,
  DBPuzzleV,
} from '../lib/dbtypes';

import { getAdminApp } from '../lib/firebaseAdminWrapper';
import { getFirestore } from 'firebase-admin/firestore';
import { slugify } from '../lib/utils';

if (process.argv.length !== 2) {
  throw Error(
    'Invalid use of generateWeeklyEmail. Usage: ./scripts/generateWeeklyEmail.ts'
  );
}

const writeFile = util.promisify(fs.writeFile);

const db = getFirestore(getAdminApp());

function sumOnto(
  a: Record<string, number>,
  b: Record<string, number> | undefined
) {
  if (!b) {
    return;
  }
  for (const [k, v] of Object.entries(b)) {
    a[k] = (a[k] || 0) + v;
  }
}

function replaceOnto<T>(
  a: Record<string, T>,
  b: Record<string, T> | undefined
) {
  if (!b) {
    return;
  }
  Object.assign(a, b);
}

async function topPuzzlesForWeek(): Promise<
  [Array<[string, string, string]>, Array<[string, string, string]>]
> {
  const totalC: Record<string, number> = {};
  const allIs: Record<string, [string, string, string]> = {};
  const d = new Date();
  for (let i = 0; i < 7; i += 1) {
    const dateString = getDateString(d);
    console.log(dateString);
    const dbres = await db.collection('ds').doc(dateString).get();
    if (dbres.exists) {
      const validationResult = DailyStatsV.decode(dbres.data());
      if (isRight(validationResult)) {
        sumOnto(totalC, validationResult.right.c);
        replaceOnto(allIs, validationResult.right.i);
      } else {
        console.error(PathReporter.report(validationResult).join(','));
      }
    }
    d.setDate(d.getDate() - 1);
  }
  const initVal: [
    Array<[string, string, string]>,
    Array<[string, string, string]>
  ] = [[], []];
  return Promise.all(
    Object.entries(totalC)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(async ([id]): Promise<(DBPuzzleT & { id: string }) | null> => {
        const dbres = await db.collection('c').doc(id).get();
        if (!dbres.exists) {
          return null;
        }
        const validationResult = DBPuzzleV.decode(dbres.data());
        if (isRight(validationResult)) {
          return { ...validationResult.right, id };
        } else {
          return null;
        }
      })
  ).then((puzzles) => {
    return puzzles
      .filter((p) => {
        if (p === null) {
          return false;
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (p.pv) {
          return false;
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (p.pvu && p.pvu.toDate() > new Date()) {
          return false;
        }
        // Don't include puzzles with comments disabled
        if (p.no_cs) {
          return false;
        }
        return true;
      })
      .map((p): [string, string, boolean, string] => {
        if (!p) {
          throw new Error('impossible');
        }
        return [
          'https://crosshare.org/crosswords/' +
            p.id +
            '/' +
            slugify(p.t) +
            '#utm_source=mailchimp&utm_medium=email&utm_campaign=weekly',
          `${p.t} by ${p.n}`,
          p.w * p.h - (p.hdn?.length || 0) < 50,
          `/crosswords/${p.id}/${slugify(p.t)}`,
        ];
      })
      .reduce((res, val) => {
        if (val[2]) {
          res[1].push([val[0], val[1], val[3]]);
        } else {
          res[0].push([val[0], val[1], val[3]]);
        }
        return res;
      }, initVal);
  });
}

async function generateWeeklyEmail() {
  const [topForWeek, topMinis] = await topPuzzlesForWeek();
  console.log('<strong>Top puzzles this week:</strong><br /><br />');
  topForWeek.slice(0, 7).forEach(([link, text]) => {
    console.log('<a href="' + link + '">' + text + '</a> - <br /><br />');
  });
  console.log('<strong>Top minis this week:</strong><br /><br />');
  topMinis.slice(0, 7).forEach(([link, text]) => {
    console.log('<a href="' + link + '">' + text + '</a> - <br /><br />');
  });

  const md = `This week's email is written by [YOUR NAME](/YOUR_CROSSHARE_USERNAME). CAN ADD A ONE SENTENCE BIO HERE OR NOT - UP TO YOU.

**Top puzzles this week:**

${topForWeek
  .slice(0, 7)
  .map(([_, text, mdLink]) => `[${text}](${mdLink}) - `)
  .join('\n\n')}

**Top minis this week:**

${topMinis
  .slice(0, 7)
  .map(([_, text, mdLink]) => `[${text}](${mdLink}) - `)
  .join('\n\n')}

ONE SENTENCE SIGN OFF / SIGNATURE`;
  writeFile('email.txt', md).then(() => {
    console.log('wrote md');
  });
}

generateWeeklyEmail().then(() => {
  console.log('Finished generation');
});
