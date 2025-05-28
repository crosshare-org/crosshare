#!/usr/bin/env -S npx tsx

import {
  command,
  number,
  option,
  positional,
  run,
  string,
  subcommands,
} from 'cmd-ts';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { ArticleT, ArticleV } from '../lib/article.js';
import { ConstructorPageV } from '../lib/constructorPage.js';
import { DBPuzzleV } from '../lib/dbtypes.js';
import { getAdminApp, mapEachResult } from '../lib/firebaseAdminWrapper.js';
import { PathReporter } from '../lib/pathReporter.js';

const db = getFirestore(getAdminApp());

function getTag(month: number, year: number) {
  return `midi-contest-${String(month).padStart(2, '0')}-${String(year).slice(
    -2
  )}`;
}

const winner = command({
  name: 'winner',
  args: {
    theme: positional({ type: string, displayName: 'theme' }),
    puzzleId: positional({ type: string, displayName: 'puzzle-id' }),
    month: option({
      type: number,
      long: 'month',
      defaultValue: () => {
        return new Date().getMonth() + 1;
      },
      defaultValueIsSerializable: true,
    }),
    year: option({
      type: number,
      long: 'year',
      defaultValue: () => {
        return new Date().getFullYear();
      },
      defaultValueIsSerializable: true,
    }),
  },
  handler: async (args) => {
    const dbres = await db.doc(`c/${args.puzzleId}`).get();
    if (!dbres.exists) {
      throw new Error('no such puzzle');
    }
    const validationResult = DBPuzzleV.decode(dbres.data());
    if (validationResult._tag !== 'Right') {
      console.error(PathReporter.report(validationResult).join(','));
      throw new Error('invalid puzzle');
    }

    const pageres = await db
      .collection('cp')
      .where('u', '==', validationResult.right.a)
      .get();
    let winner = validationResult.right.n;
    if (pageres.docs.length) {
      const page = ConstructorPageV.decode(pageres.docs[0]?.data());
      if (page._tag === 'Right') {
        winner = `@${page.right.i}`;
      }
    }

    const tag = getTag(args.month, args.year);
    const articleDoc = await db.doc(`a/tag:${tag}`).get();
    let article: ArticleT = {
      s: `tag:${tag}`,
      c: '',
      t: `Midi contest for ${Intl.DateTimeFormat('en', {
        month: 'long',
      }).format(new Date(0, args.month - 1))} ${args.year} - ${args.theme}`,
      f: false,
    };
    if (articleDoc.exists) {
      const vr = ArticleV.decode(articleDoc.data());
      if (vr._tag !== 'Right') {
        throw new Error('malformed article');
      }
      article = vr.right;
    }
    article.c = `This month's contest theme was **${args.theme}**.

This month's winner is ${winner}!`;
    await articleDoc.ref.set({ ...article, ua: Timestamp.now() });
    console.log('updated article');

    await dbres.ref.update({ tg_f: FieldValue.arrayUnion('contest-winner') });
    console.log('added winner tag');

    await db
      .doc('settings/tags')
      .update({ disallowed: FieldValue.arrayUnion(tag) });
    console.log('disallowed contest tag');
  },
});

const theme = command({
  name: 'theme',
  args: {
    theme: positional({ type: string, displayName: 'theme' }),
    month: option({
      type: number,
      long: 'month',
      defaultValue: () => {
        return new Date().getMonth() + 1;
      },
      defaultValueIsSerializable: true,
    }),
    year: option({
      type: number,
      long: 'year',
      defaultValue: () => {
        return new Date().getFullYear();
      },
      defaultValueIsSerializable: true,
    }),
  },
  handler: async (args) => {
    const tag = getTag(args.month, args.year);
    const articleDoc = await db.doc(`a/tag:${tag}`).get();
    if (articleDoc.exists) {
      throw new Error('article already exists!');
    }
    console.log('creating article');
    const article: ArticleT = {
      s: `tag:${tag}`,
      c: `This month's contest theme is **${args.theme}**. Join us on [Discord](https://discord.gg/8Tu67jB4F3) for details on how to enter.`,
      t: `Midi contest for ${Intl.DateTimeFormat('en', {
        month: 'long',
      }).format(new Date(0, args.month - 1))} ${args.year} - ${args.theme}`,
      f: false,
    };
    await articleDoc.ref.set({ ...article, ua: Timestamp.now() });
  },
});

const votes = command({
  name: 'votes',
  args: {
    month: option({
      type: number,
      long: 'month',
      defaultValue: () => {
        return new Date().getMonth() + 1;
      },
      defaultValueIsSerializable: true,
    }),
    year: option({
      type: number,
      long: 'year',
      defaultValue: () => {
        return new Date().getFullYear();
      },
      defaultValueIsSerializable: true,
    }),
  },
  handler: async (args) => {
    const tag = getTag(args.month, args.year);
    const puzzles = await Promise.all(
      await mapEachResult(
        db.collection('c').where('tg_u', 'array-contains', tag),
        DBPuzzleV,
        async (dbpuzz, docId) => {
          const statsRes = await db.collection('s').doc(docId).get();
          return {
            ...dbpuzz,
            id: docId,
            solves: Number(statsRes.data()?.n ?? 0),
          };
        }
      )
    );
    console.log(`There were ${puzzles.length} entrants`);
    console.log(`Most likes:`);
    puzzles.sort((a, b) => (a.lk?.length || 0) - (b.lk?.length || 0)).reverse();
    puzzles.slice(0, 3).forEach((p) => {
      console.log(p.t, p.n, p.lk?.length);
    });
    console.log(`Most solved:`);
    puzzles.sort((a, b) => a.solves - b.solves).reverse();
    puzzles.slice(0, 3).forEach((p) => {
      console.log(p.t, p.n, p.solves);
    });
    console.log(`Best likes to solves:`);
    puzzles
      .sort(
        (a, b) =>
          (a.solves ? (a.lk?.length ?? 0) / a.solves : 0) -
          (b.solves ? (b.lk?.length ?? 0) / b.solves : 0)
      )
      .reverse();
    puzzles.slice(0, 3).forEach((p) => {
      console.log(
        p.t,
        p.n,
        p.solves,
        p.solves ? (p.lk?.length ?? 0) / p.solves : 0
      );
    });
  },
});

const cmd = subcommands({
  name: 'contest',
  cmds: { theme, winner, votes },
});

void run(cmd, process.argv.slice(2));
