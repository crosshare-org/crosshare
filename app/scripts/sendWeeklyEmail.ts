#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import { exit } from 'node:process';
import util from 'node:util';
import { parse } from 'csv-parse/sync';
import { lightFormat } from 'date-fns/lightFormat';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { Plugin, unified } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';
import type { Visitor } from 'unist-util-visit';
import { validate } from '../lib/article';
import { RATE_LIMIT, getClient, sendEmail } from '../lib/email';
import { firestore } from '../lib/firebaseAdminWrapper';
import { AccountPrefsT, AccountPrefsV } from '../lib/prefs';

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
  return (tree) => {
    visit(tree, 'link', visitor);
  };
};

if (process.argv.length !== 3) {
  console.error(
    'Invalid use of sendWeeklyEmail. Usage: ./scripts/sendWeeklyEmail.ts test|start|[userId]'
  );
  exit(1);
}
const arg = process.argv[2];

async function sendWeeklyEmail() {
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
      .use(remarkParse)
      .use(linksForEmail)
      .use(remarkStringify)
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
        if (arg === 'test') {
          if (uid !== 'fSEwJorvqOMK5UhNMHa4mu48izl1') {
            continue;
          }
        } else if (arg !== 'start') {
          if (arg === uid) {
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

sendWeeklyEmail()
  .then(() => {
    console.log('Done');
  })
  .catch((e: unknown) => {
    console.error(e);
  });
