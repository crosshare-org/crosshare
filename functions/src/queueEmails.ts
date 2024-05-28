import {
  getAdminApp,
  mapEachResult,
} from '../../app/lib/firebaseAdminWrapper.js';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

import {
  NotificationV,
  NotificationT,
  CommentNotificationT,
  isCommentNotification,
  isReplyNotification,
  ReplyNotificationT,
  NewPuzzleNotificationT,
  isNewPuzzleNotification,
  isFeaturedNotification,
  FeaturedNotificationT,
} from '../../app/lib/notificationTypes.js';
import { AccountPrefsV, AccountPrefsT } from '../../app/lib/prefs.js';
import {
  EmailClient,
  RATE_LIMIT,
  emailLink,
  getClient,
  sendEmail,
} from '../../app/lib/email.js';
import { getFirestore } from 'firebase-admin/firestore';

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

const CAMPAIGN = 'notifications';

const puzzleLink = (puzzleId: string) =>
  emailLink(CAMPAIGN, `crosswords/${puzzleId}`);

async function queueEmailForUser(
  client: EmailClient,
  userId: string,
  notifications: Array<NotificationT>
) {
  const db = getFirestore(getAdminApp());
  const sorted = notifications.sort((n1, n2) => n1.id.localeCompare(n2.id));
  const prefsRes = await db.doc(`prefs/${userId}`).get();
  let prefs: AccountPrefsT | null = null;
  if (prefsRes.exists) {
    const validationResult = AccountPrefsV.decode(prefsRes.data());
    if (validationResult._tag === 'Right') {
      prefs = validationResult.right;
      if (prefs.bounced || prefs.unsubs?.includes('all')) {
        return;
      }
    }
  }

  let markdown = '';
  let subject: string | null = null;
  const read: Array<NotificationT> = [];

  if (!prefs?.unsubs?.includes('comments')) {
    const comments: Array<CommentNotificationT> = sorted.filter(
      isCommentNotification
    );
    const commentsByPuzzle = comments.reduce(
      (
        rv: Record<string, Array<CommentNotificationT>>,
        x: CommentNotificationT
      ) => {
        (rv[x.p] = rv[x.p] || []).push(x);
        return rv;
      },
      {}
    );
    if (comments.length) {
      subject =
        'Crosshare: new comments on ' +
        joinStringsWithAnd(
          Object.values(commentsByPuzzle)
            .map((a) => {
              if (a[0] === undefined) {
                throw new Error('oob');
              }
              return a[0].pn;
            })
            .slice(0, 3)
        );
      markdown += '### Comments on your puzzles:\n\n';
      Object.entries(commentsByPuzzle).forEach(
        ([puzzleId, commentNotifications]) => {
          read.push(...commentNotifications);
          const nameDisplay = joinStringsWithAnd(
            commentNotifications.map((n) => n.cn)
          );
          markdown += `* ${nameDisplay} commented on [${
            commentNotifications[0]?.pn || 'your puzzle'
          }](${puzzleLink(puzzleId)})\n`;
        }
      );
      markdown += '\n\n';
    }

    const replies: Array<ReplyNotificationT> =
      sorted.filter(isReplyNotification);
    const repliesByPuzzle = replies.reduce(
      (
        rv: Record<string, Array<ReplyNotificationT>>,
        x: ReplyNotificationT
      ) => {
        (rv[x.p] = rv[x.p] || []).push(x);
        return rv;
      },
      {}
    );
    if (replies.length) {
      if (!subject) {
        subject =
          'Crosshare: new replies to your comments on ' +
          joinStringsWithAnd(
            Object.values(repliesByPuzzle)
              .map((a) => {
                if (a[0] === undefined) {
                  throw new Error('oob');
                }
                return a[0].pn;
              })
              .slice(0, 3)
          );
      }
      markdown += '### Replies to your comments:\n\n';
      Object.entries(repliesByPuzzle).forEach(
        ([puzzleId, commentNotifications]) => {
          read.push(...commentNotifications);
          const nameDisplay = joinStringsWithAnd(
            commentNotifications.map((n) => n.cn)
          );
          markdown += `* ${nameDisplay} replied to your comments on [${
            commentNotifications[0]?.pn || 'a puzzle'
          }](${puzzleLink(puzzleId)})\n`;
        }
      );
      markdown += '\n\n';
    }
  }

  if (!prefs?.unsubs?.includes('newpuzzles')) {
    const nps: Array<NewPuzzleNotificationT> = sorted.filter(
      isNewPuzzleNotification
    );
    if (nps.length) {
      const plural = nps.length > 1 ? 's' : '';
      const constructorPlural =
        nps.length > 1 ? 'constructors' : 'a constructor';
      if (!subject) {
        subject = `Crosshare: new puzzle${plural} by ${joinStringsWithAnd(
          nps.map((a) => a.an).slice(0, 3)
        )}`;
      }
      markdown += `### New puzzle${plural} by ${constructorPlural} you follow:\n\n`;
      nps.forEach((p) => {
        read.push(p);
        markdown += `* ${p.an} published [${p.pn}](${puzzleLink(p.p)})\n`;
      });
      markdown += '\n\n';
    }
  }

  if (!prefs?.unsubs?.includes('featured')) {
    const fs: Array<FeaturedNotificationT> = sorted.filter(
      isFeaturedNotification
    );
    if (fs.length) {
      const plural = fs.length > 1 ? 's' : '';
      if (!subject) {
        subject = `Crosshare featured your puzzle${plural}!`;
      }
      markdown += `### Crosshare has featured your puzzle${plural}:\n\n`;
      fs.forEach((p) => {
        read.push(p);
        markdown += `* [${p.pn}](${puzzleLink(p.p)}) was featured${
          p.as ? ' as ' + p.as : ''
        }\n`;
      });
      markdown += '\n\n';
    }
  }

  if (!markdown) {
    return;
  }

  return sendEmail({
    client,
    userId,
    subject: subject || 'Crosshare Notifications',
    oneClickUnsubscribeTag: 'all',
    campaign: CAMPAIGN,
    markdown,
  }).then(() =>
    Promise.all(read.map((n) => db.doc(`n/${n.id}`).update({ r: true })))
  );
}

export async function queueEmails() {
  const db = getFirestore(getAdminApp());
  const unread = await mapEachResult(
    db
      .collection('n')
      .where('e', '==', false)
      .where('r', '==', false)
      .where('t', '<=', AdminTimestamp.fromDate(new Date())),
    NotificationV,
    (n) => n
  );
  console.log('unread: ', unread.length);
  const unreadsByUserId = unread.reduce(
    (rv: Record<string, Array<NotificationT>>, x: NotificationT) => {
      (rv[x.u] = rv[x.u] || []).push(x);
      return rv;
    },
    {}
  );
  const client = await getClient();
  console.log('attempting to queue for ', Object.keys(unreadsByUserId).length);
  let count = 0;
  let start = 0;
  for (const userId in unreadsByUserId) {
    const unreads = unreadsByUserId[userId];
    if (!unreads) {
      continue;
    }
    if (count == 0) {
      // start the clock
      start = Date.now();
    }
    count += 1;
    if (count > RATE_LIMIT) {
      const elapsed = Date.now() - start;
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
      }
      count = 0;
    }
    await queueEmailForUser(client, userId, unreads).then(() =>
      Promise.all(unreads.map((n) => db.doc(`n/${n.id}`).update({ e: true })))
    );
  }
}
