import { AdminApp, AdminTimestamp, getUser } from '../lib/firebaseWrapper';
import { PuzzleResult, puzzleFromDB } from './types';
import type firebaseAdminType from 'firebase-admin';

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { DBPuzzleV, DBPuzzleT } from './dbtypes';
import { adminTimestamp } from './adminTimestamp';
import { mapEachResult } from './dbUtils';
import { ConstructorPageT, ConstructorPageV } from './constructorPage';
import { NotificationV, NotificationT } from './notifications';
import SimpleMarkdown from 'simple-markdown';
import { AccountPrefsV, AccountPrefsT } from './prefs';

export async function getStorageUrl(storageKey: string): Promise<string | null> {
  const profilePic = AdminApp.storage().bucket().file(storageKey);
  if ((await profilePic.exists())[0]) {
    try {
      return (await profilePic.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      }))[0];
    } catch (e) {
      console.log('error getting profile pic', storageKey, e);
    }
  } else {
    console.log('pic doesnt exist', storageKey);
  }
  return null;
}

const PuzzleIndexV = t.intersection([
  t.type({
    /** array of puzzle timestamps */
    t: t.array(adminTimestamp),
    /** array of puzzle ids */
    i: t.array(t.string)
  }),
  t.partial({
    /** array of private puzzle ids */
    pv: t.array(t.string),
    /** array of puzzle ids that are private until a timestamp */
    pvui: t.array(t.string),
    /** array of timestamps that the above puzzles become public */
    pvut: t.array(adminTimestamp),
  })
]);
type PuzzleIndexT = t.TypeOf<typeof PuzzleIndexV>;

async function getPuzzlesForPage(indexDocId: string, queryField: string, queryValue: string | boolean, page: number, page_size: number): Promise<[Array<PuzzleResult>, number]> {
  const db = AdminApp.firestore();
  const indexDoc = await db.collection('i').doc(indexDocId).get();
  let index: PuzzleIndexT | null = null;
  if (indexDoc.exists) {
    const validationResult = PuzzleIndexV.decode(indexDoc.data());
    if (isRight(validationResult)) {
      index = validationResult.right;
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      throw new Error('failed to validate index for ' + indexDocId);
    }
  }
  if (index === null) {
    console.log('No index, initializing', indexDocId);
    index = { t: [], i: [] };
  }

  let q = db.collection('c').where(queryField, '==', queryValue).orderBy('p', 'desc');
  if (index.i.length) {
    const mostRecentTimestamp = index.t[0];
    if (mostRecentTimestamp) {
      q = q.endBefore(mostRecentTimestamp);
    }
  }
  const newPuzzles: Array<DBPuzzleT & { id: string }> = await mapEachResult(q, DBPuzzleV, (dbpuzz, docId) => {
    return { ...dbpuzz, id: docId };
  });

  if (newPuzzles.length) {
    console.log(`Adding ${newPuzzles.length} to index for ${indexDocId}`);
    // Add new puzzles to the beginning
    for (const p of newPuzzles.reverse()) {
      index.t.unshift(AdminTimestamp.fromMillis(p.p.toMillis()));
      index.i.unshift(p.id);
      if (p.pv) {
        index.pv = index.pv || [];
        index.pv.push(p.id);
      }
      if (p.pvu) {
        index.pvui = index.pvui || [];
        index.pvut = index.pvut || [];
        index.pvut.unshift(AdminTimestamp.fromMillis(p.pvu.toMillis()));
        index.pvui.unshift(p.id);
      }
    }
    await db.collection('i').doc(indexDocId).set(index);
  }

  // Filter out any private puzzles
  for (let i = index.i.length; i >= 0; i--) {
    const pid = index.i[i];
    if (index.pv ?.includes(pid)) {
      index.i.splice(i, 1);
      index.t.splice(i, 1);
    } else if (index.pvui ?.includes(pid) && index.pvut) {
      const pvidx = index.pvui.indexOf(pid);
      const goLiveTime = index.pvut[pvidx];
      if (goLiveTime > AdminTimestamp.now()) {
        index.i.splice(i, 1);
        index.t.splice(i, 1);
      }
    }
  }

  const start = page * page_size;
  const entriesForPage = index.i.slice(start, start + page_size);

  const puzzles: Array<PuzzleResult> = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const puzzleId of entriesForPage) {
    const alreadyHave = newPuzzles.find(x => x.id === puzzleId);
    if (alreadyHave) {
      puzzles.push({ ...puzzleFromDB(alreadyHave), id: alreadyHave.id });
      continue;
    }

    const dbres = await db.collection('c').doc(puzzleId).get();
    if (!dbres.exists) {
      console.warn('Puzzle id in index but no puzzle exists ', puzzleId);
      continue;
    }
    const validationResult = DBPuzzleV.decode(dbres.data());
    if (isRight(validationResult)) {
      puzzles.push({ ...puzzleFromDB(validationResult.right), id: dbres.id });
    } else {
      console.error('Puzzle id in index but invalid puzzle', puzzleId);
      console.error(PathReporter.report(validationResult).join(','));
    }
  }
  return [puzzles, index.i.length];
}

export async function getPuzzlesForConstructorPage(userId: string, page: number, page_size: number): Promise<[Array<PuzzleResult>, number]> {
  return getPuzzlesForPage(userId, 'a', userId, page, page_size);
}

export async function getPuzzlesForFeatured(page: number, page_size: number): Promise<[Array<PuzzleResult>, number]> {
  return getPuzzlesForPage('featured', 'f', true, page, page_size);
}

const usernameMap: Record<string, ConstructorPageT> = {};
let usernamesUpdated: number | null = null;
const usernamesTTL = 1000 * 60 * 10;

export async function userIdToPage(userId: string): Promise<ConstructorPageT | null> {
  const now = Date.now();
  if (usernamesUpdated === null || now - usernamesUpdated > usernamesTTL) {
    const db = AdminApp.firestore();
    let query: firebaseAdminType.firestore.Query = db.collection('cp');
    if (usernamesUpdated) {
      query = query.where('t', '>=', AdminTimestamp.fromMillis(usernamesUpdated));
    }
    try {
      await mapEachResult(query,
        ConstructorPageV, (cp, docId) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { t, ...partial } = cp;
          usernameMap[cp.u] = { ...partial, id: docId };
        });
      usernamesUpdated = now;
    } catch (e) {
      console.error('error updating constructor pages');
      console.error(e);
    }
  }
  return usernameMap[userId] || null;
}

export async function sendEmail({ toAddress, subject, text, html }: { toAddress: string, subject: string, text: string, html: string }) {
  const db = AdminApp.firestore();
  return db.collection('mail').add({
    to: [toAddress],
    message: { subject, text, html }
  });
}

const joinStringsWithAnd = (vals: Array<string>) => {
  const dedup = Array.from(new Set(vals)).sort();
  if (dedup.length === 1) {
    return dedup[0];
  } else if (dedup.length === 2) {
    return `${dedup[0]} and ${dedup[1]}`;
  } else {
    return dedup.slice(0, -1).join(', ') + ' and ' + dedup.slice(-1);
  }
};

const emailLink = (linkTo: string) =>
  `https://crosshare.org/${linkTo}#utm_source=crosshare&utm_medium=email&utm_campaign=notifications`;

const puzzleLink = (puzzleId: string) => emailLink(`crosswords/${puzzleId}`);

const tagsToReplace: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

function replaceTag(tag: string) {
  return tagsToReplace[tag] || tag;
}

function safeForHtml(str: string) {
  return str.replace(/[&<>]/g, replaceTag);
}

async function queueEmailForUser(userId: string, notifications: Array<NotificationT>) {
  const db = AdminApp.firestore();
  const sorted = notifications.sort((n1, n2) => n1.id.localeCompare(n2.id));
  const prefsRes = await db.doc(`prefs/${userId}`).get();
  let prefs: AccountPrefsT | null = null;
  if (prefsRes.exists) {
    const validationResult = AccountPrefsV.decode(prefsRes.data());
    if (isRight(validationResult)) {
      prefs = validationResult.right;
      if (prefs.unsubs ?.includes('all')) {
        return;
      }
    }
  }

  const user = await getUser(userId);
  const toAddress = user.email;
  if (!toAddress) {
    console.error('no to address', userId);
    return;
  }

  let markdown = '';
  let subject: string | null = null;
  const read: Array<NotificationT> = [];

  if (!prefs ?.unsubs ?.includes('comments')) {
    const comments = sorted.filter(n => n.k === 'comment');
    const commentsByPuzzle = comments.reduce((rv: Record<string, Array<NotificationT>>, x: NotificationT) => {
      (rv[x.p] = rv[x.p] || []).push(x);
      return rv;
    }, {});
    if (comments.length) {
      subject = 'Crosshare: new comments on ' + joinStringsWithAnd(Object.values(commentsByPuzzle).map(a => a[0].pn).slice(0, 3));
      markdown += '### Comments on your puzzles:\n\n';
      Object.entries(commentsByPuzzle).forEach(([puzzleId, commentNotifications]) => {
        read.push(...commentNotifications);
        const nameDisplay = joinStringsWithAnd(commentNotifications.map(n => n.cn));
        markdown += `* ${nameDisplay} commented on [${commentNotifications[0].pn}](${puzzleLink(puzzleId)})\n`;
      });
      markdown += '\n\n';
    }

    const replies = sorted.filter(n => n.k === 'reply');
    const repliesByPuzzle = replies.reduce((rv: Record<string, Array<NotificationT>>, x: NotificationT) => {
      (rv[x.p] = rv[x.p] || []).push(x);
      return rv;
    }, {});
    if (replies.length) {
      if (!subject) {
        subject = 'Crosshare: new replies to your comments on ' + joinStringsWithAnd(Object.values(repliesByPuzzle).map(a => a[0].pn).slice(0, 3));
      }
      markdown += '### Replies to your comments:\n\n';
      Object.entries(repliesByPuzzle).forEach(([puzzleId, commentNotifications]) => {
        read.push(...commentNotifications);
        const nameDisplay = joinStringsWithAnd(commentNotifications.map(n => n.cn));
        markdown += `* ${nameDisplay} replied to your comments on [${commentNotifications[0].pn}](${puzzleLink(puzzleId)})\n`;
      });
      markdown += '\n\n';
    }
  }

  if (!markdown) {
    return;
  }

  markdown += `---

Crosshare notifications are sent at most once per day. To manage your notification preferences visit [your Account page](${emailLink('account')})`;

  return sendEmail({
    toAddress,
    subject: subject || 'Crosshare Notifications',
    text: markdown,
    html: `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
<title>${safeForHtml(subject || 'Crosshare Notifications')}</title>
</head>
<body>
${SimpleMarkdown.defaultHtmlOutput(SimpleMarkdown.defaultBlockParse(markdown))}
</body>
</html>`
  }).then(
    () => Promise.all(read.map(n => db.doc(`n/${n.id}`).update({ r: true })))
  );
}

export async function queueEmails() {
  const db = AdminApp.firestore();
  const unread = await mapEachResult(
    db.collection('n').where('e', '==', false).where('r', '==', false).where('t', '<=', AdminTimestamp.fromDate(new Date())),
    NotificationV, (n) => n);
  console.log('unread: ', unread.length);
  const unreadsByUserId = unread.reduce((rv: Record<string, Array<NotificationT>>, x: NotificationT) => {
    (rv[x.u] = rv[x.u] || []).push(x);
    return rv;
  }, {});
  console.log('attempting to queue for ', Object.keys(unreadsByUserId).length);
  return Promise.all(Object.entries(unreadsByUserId).map(e => queueEmailForUser(...e).then(
    () => Promise.all(e[1].map(n => db.doc(`n/${n.id}`).update({ e: true })))
  )));
}
