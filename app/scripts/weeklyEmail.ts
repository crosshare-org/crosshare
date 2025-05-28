#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import util from 'node:util';
import { command, option, optional, run, string, subcommands } from 'cmd-ts';
import { parse } from 'csv-parse/sync';
import { lightFormat } from 'date-fns/lightFormat';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { Plugin, unified } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { Visitor } from 'unist-util-visit';
import { ArticleT, validate } from '../lib/article';
import {
  DBPuzzleT,
  DBPuzzleV,
  DailyStatsV,
  getDateString,
} from '../lib/dbtypes.js';
import { RATE_LIMIT, getClient, sendEmail } from '../lib/email';
import { firestore, getAdminApp } from '../lib/firebaseAdminWrapper';
import { PathReporter } from '../lib/pathReporter.js';
import { AccountPrefsT, AccountPrefsV } from '../lib/prefs';
import { sizeTag } from '../lib/sizeTag.js';
import { slugify } from '../lib/utils.js';

const readFile = util.promisify(fs.readFile);

type LinkNode = {
  url: string;
} & Node;

const linksForEmail: Plugin = () => {
  const visitor: Visitor<LinkNode> = (node) => {
    const url = new URL(node.url, 'https://crosshare.org');
    if (url.hostname !== 'crosshare.org') {
      return;
    }
    url.searchParams.set('utm_source', 'mailchimp');
    url.searchParams.set('utm_medium', 'email');
    url.searchParams.set('utm_campaign', 'weekly');
    node.url = url.toString();
  };
  return (tree: Node) => {
    visit(tree, 'link', visitor);
  };
};

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
      .slice(0, 250)
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
        // Filter a couple of media accts
        if (p.a === 'ira2BUejBHgWTBVlQdOqVPtIaSB2') {
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
  const slug = `weekly-email-${lightFormat(new Date(), 'yyyy-MM-dd')}`;

  if ((await db.collection('a').doc(slug).get()).exists) {
    throw new Error('weekly email already exists for date');
  }

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

  const article: ArticleT = {
    s: slug,
    c: md,
    t: "This week's most popular crosswords",
    f: false,
  };
  return db
    .collection('a')
    .doc(slug)
    .set({
      ...article,
      ua: Timestamp.now(),
    })
    .then(() => {
      console.log(`https://crosshare.org/articles/${slug}/edit`);
    });
}

const generate = command({
  name: 'generate',
  args: {},
  handler: async () => {
    await generateWeeklyEmail();
  },
});

async function sendWeeklyEmail(test: boolean, from: string | undefined) {
  const db = firestore();
  const todayslug = `weekly-email-${lightFormat(new Date(), 'yyyy-MM-dd')}`;
  const dbres = await db
    .collection('a')
    .where('s', '<=', todayslug)
    .orderBy('s', 'desc')
    .limit(1)
    .get();
  const article = validate(dbres.docs[0]?.data());
  if (!article) {
    console.error('missing email content');
    return;
  }
  const md = String(
    await unified()
      .use([remarkParse, linksForEmail, remarkStringify])
      .process(article.c)
  );
  const client = await getClient();

  let start = 0;
  let sawUID = false;
  let numSent = 0;
  let promises: Promise<void>[] = [];

  return readFile('accounts.csv')
    .then(async (binary) => {
      const csv: string[][] = (
        parse(binary, {
          quote: null,
          escape: null,
          relax_column_count: true,
        }) as string[][]
      ).filter((r: string[]) => r[1]); // Don't bother for users w/ no email address
      for (const r of csv) {
        const uid = r[0];
        if (!uid) {
          continue;
        }
        if (test) {
          if (uid !== 'fSEwJorvqOMK5UhNMHa4mu48izl1') {
            continue;
          }
        } else if (from) {
          if (from === uid) {
            sawUID = true;
            continue;
          }
          if (!sawUID) {
            continue;
          }
        }

        const prefsRes = await db.doc(`prefs/${uid}`).get();
        let prefs: AccountPrefsT | null = null;
        if (prefsRes.exists) {
          const validationResult = AccountPrefsV.decode(prefsRes.data());
          if (validationResult._tag === 'Right') {
            prefs = validationResult.right;
            if (prefs.bounced || prefs.unsubs?.includes('weekly')) {
              continue;
            }
          }
        }

        if (promises.length === 0) {
          // start the clock
          start = Date.now();
        }
        numSent += 1;
        promises.push(
          sendEmail({
            client,
            email: r[1],
            userId: uid,
            subject: article.t,
            markdown: md,
            oneClickUnsubscribeTag: 'weekly',
            campaign: 'weekly',
            footerText:
              'For info about how these puzzles are selected [click here](https://crosshare.org/articles/weekly-email).',
          }).then((x) => {
            console.log(`${uid} - ${r[1]} - ${x?.MessageId}`);
          })
        );
        if (promises.length > RATE_LIMIT) {
          await Promise.all(promises);
          promises = [];
          const elapsed = Date.now() - start;
          if (elapsed < 1000) {
            await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
          }
        }
      }
      await Promise.all(promises);
      console.log('sent', numSent);
    })
    .catch((e: unknown) => {
      console.error(e);
    });
}

const send = command({
  name: 'send',
  args: {
    from: option({ type: optional(string), long: 'from' }),
  },
  handler: async (args) => {
    await sendWeeklyEmail(false, args.from);
  },
});

const test = command({
  name: 'test',
  args: {},
  handler: async () => {
    await sendWeeklyEmail(true, undefined);
  },
});

const cmd = subcommands({
  name: 'weeklyEmail',
  cmds: { generate, test, send },
});

void run(cmd, process.argv.slice(2));
