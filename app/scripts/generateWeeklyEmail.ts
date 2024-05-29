#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script

import { lightFormat } from 'date-fns/lightFormat';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { ArticleT } from '../lib/article.js';
import {
  DBPuzzleT,
  DBPuzzleV,
  DailyStatsV,
  getDateString,
} from '../lib/dbtypes.js';
import { getAdminApp } from '../lib/firebaseAdminWrapper.js';
import { PathReporter } from '../lib/pathReporter.js';
import { sizeTag } from '../lib/sizeTag.js';
import { slugify } from '../lib/utils.js';

if (process.argv.length !== 2) {
  throw Error(
    'Invalid use of generateWeeklyEmail. Usage: ./scripts/generateWeeklyEmail.ts'
  );
}
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

enum Category {
  Meta,
  Cryptic,
  Mini,
  Midi,
  Full,
}

async function topPuzzlesForWeek(): Promise<
  Record<Category, [string, string, string][]>
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
      if (validationResult._tag === 'Right') {
        sumOnto(totalC, validationResult.right.c);
        replaceOnto(allIs, validationResult.right.i);
      } else {
        console.error(PathReporter.report(validationResult).join(','));
      }
    }
    d.setDate(d.getDate() - 1);
  }
  const initVal: Record<Category, [string, string, string][]> = {
    [Category.Mini]: [],
    [Category.Midi]: [],
    [Category.Full]: [],
    [Category.Meta]: [],
    [Category.Cryptic]: [],
  };
  return Promise.all(
    Object.entries(totalC)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 150)
      .map(async ([id]): Promise<(DBPuzzleT & { id: string }) | null> => {
        const dbres = await db.collection('c').doc(id).get();
        if (!dbres.exists) {
          return null;
        }
        const validationResult = DBPuzzleV.decode(dbres.data());
        if (validationResult._tag === 'Right') {
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
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
        if (p.pvu && p.pvu.toDate() > new Date()) {
          return false;
        }
        // Don't include puzzles with comments disabled
        if (p.no_cs) {
          return false;
        }
        return true;
      })
      .map((p): [string, string, Category | undefined, string] => {
        if (!p) {
          throw new Error('impossible');
        }
        const category = (() => {
          if (p.ct_ans?.length) {
            return Category.Meta;
          }
          if (p.tg_u?.find((s) => s === 'cryptic')) {
            return Category.Cryptic;
          }
          const size = sizeTag(p.w * p.h - (p.hdn?.length || 0));
          if (size === 'mini') {
            return Category.Mini;
          }
          if (size === 'midi') {
            return Category.Midi;
          }
          if (size === 'full') {
            return Category.Full;
          }
          return undefined;
        })();
        return [
          'https://crosshare.org/crosswords/' + p.id + '/' + slugify(p.t),
          `${p.t} by ${p.n}`,
          category,
          `/crosswords/${p.id}/${slugify(p.t)}`,
        ];
      })
      .reduce((res, val) => {
        const category = val[2];
        if (category !== undefined) {
          res[category].push([val[0], val[1], val[3]]);
        }
        return res;
      }, initVal);
  });
}

async function generateWeeklyEmail() {
  const topPuzzles = await topPuzzlesForWeek();

  let md = '';

  for (const [cat, name, count] of [
    [Category.Full, 'full-size puzzles', 2],
    [Category.Midi, 'midis', 2],
    [Category.Mini, 'minis', 2],
    [Category.Meta, 'metas', 2],
    [Category.Cryptic, 'cryptics', 1],
  ] as const) {
    const puzzles = topPuzzles[cat];
    if (puzzles.length) {
      md += `**Top ${name} this week:**

${puzzles
  .slice(0, count * 2)
  .map(([_, text, mdLink]) => `[${text}](${mdLink}) - `)
  .join('\n\n')}

`;
    }
  }

  const slug = `weekly-email-${lightFormat(new Date(), 'yyyy-MM-dd')}`;
  const article: ArticleT = {
    s: slug,
    c: md,
    t: "This week's most popular crosswords",
    f: false,
  };
  return db
    .collection('a')
    .add({
      ...article,
      ua: Timestamp.now(),
    })
    .then(() => {
      console.log(`https://crosshare.org/articles/${slug}/edit`);
    });
}

generateWeeklyEmail()
  .then(() => {
    console.log('Finished generation');
  })
  .catch((e: unknown) => {
    console.error(e);
  });
