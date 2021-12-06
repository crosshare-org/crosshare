import { AdminApp, AdminTimestamp, getUser } from '../lib/firebaseWrapper';
import {
  puzzleFromDB,
  Comment,
  PuzzleResultWithAugmentedComments,
} from './types';
import type firebaseAdminType from 'firebase-admin';

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  DBPuzzleV,
  CategoryIndexT,
  getDateString,
  addZeros,
  CommentWithRepliesT,
} from './dbtypes';
import { adminTimestamp } from './adminTimestamp';
import { mapEachResult } from './dbUtils';
import { ConstructorPageT, ConstructorPageV } from './constructorPage';
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
} from './notifications';
import SimpleMarkdown from 'simple-markdown';
import { AccountPrefsV, AccountPrefsT } from './prefs';
import { NextPuzzleLink } from '../components/Puzzle';
import { GetServerSideProps } from 'next';
import { getDailyMinis } from './dailyMinis';
import { EmbedOptionsT } from './embedOptions';
import { ArticleT, validate } from './article';
import { isUserPatron } from './patron';

export async function getStorageUrl(
  storageKey: string
): Promise<string | null> {
  const profilePic = AdminApp.storage().bucket().file(storageKey);
  if ((await profilePic.exists())[0]) {
    try {
      return (
        await profilePic.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        })
      )[0];
    } catch (e) {
      console.log('error getting profile pic', storageKey, e);
    }
  } else {
    console.log('pic doesnt exist', storageKey);
  }
  return null;
}

export const PuzzleIndexV = t.intersection([
  t.type({
    /** array of puzzle timestamps */
    t: t.array(adminTimestamp),
    /** array of puzzle ids */
    i: t.array(t.string),
  }),
  t.partial({
    /** array of private puzzle ids */
    pv: t.array(t.string),
    /** array of puzzle ids that are private until a timestamp */
    pvui: t.array(t.string),
    /** array of timestamps that the above puzzles become public */
    pvut: t.array(adminTimestamp),
  }),
]);

const usernameMap: Record<string, ConstructorPageT> = {};
let usernamesUpdated: number | null = null;
const usernamesTTL = 1000 * 60 * 10;

export async function userIdToPage(
  userId: string
): Promise<ConstructorPageT | null> {
  const now = Date.now();
  if (usernamesUpdated === null || now - usernamesUpdated > usernamesTTL) {
    const db = AdminApp.firestore();
    let query: firebaseAdminType.firestore.Query = db.collection('cp');
    if (usernamesUpdated) {
      query = query.where(
        't',
        '>=',
        AdminTimestamp.fromMillis(usernamesUpdated)
      );
    }
    try {
      await mapEachResult(query, ConstructorPageV, (cp, docId) => {
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

export async function sendEmail({
  toAddress,
  subject,
  text,
  html,
}: {
  toAddress: string;
  subject: string;
  text: string;
  html: string;
}) {
  const db = AdminApp.firestore();
  return db.collection('mail').add({
    to: [toAddress],
    message: { subject, text, html },
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
  '>': '&gt;',
};

function replaceTag(tag: string) {
  return tagsToReplace[tag] || tag;
}

function safeForHtml(str: string) {
  return str.replace(/[&<>]/g, replaceTag);
}

async function queueEmailForUser(
  userId: string,
  notifications: Array<NotificationT>
) {
  const db = AdminApp.firestore();
  const sorted = notifications.sort((n1, n2) => n1.id.localeCompare(n2.id));
  const prefsRes = await db.doc(`prefs/${userId}`).get();
  let prefs: AccountPrefsT | null = null;
  if (prefsRes.exists) {
    const validationResult = AccountPrefsV.decode(prefsRes.data());
    if (isRight(validationResult)) {
      prefs = validationResult.right;
      if (prefs.unsubs?.includes('all')) {
        return;
      }
    }
  }

  const user = await getUser(userId);
  const toAddress = user?.email;
  if (!toAddress) {
    console.error('no to address', userId);
    return;
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

  markdown += `---

Crosshare notifications are sent at most once per day. To manage your notification preferences visit [your Account page](${emailLink(
    'account'
  )})`;

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
</html>`,
  }).then(() =>
    Promise.all(read.map((n) => db.doc(`n/${n.id}`).update({ r: true })))
  );
}

export async function queueEmails() {
  const db = AdminApp.firestore();
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
  console.log('attempting to queue for ', Object.keys(unreadsByUserId).length);
  return Promise.all(
    Object.entries(unreadsByUserId).map((e) =>
      queueEmailForUser(...e).then(() =>
        Promise.all(e[1].map((n) => db.doc(`n/${n.id}`).update({ e: true })))
      )
    )
  );
}

interface PageErrorProps {
  error: string;
}

export type ArticlePageProps = PageErrorProps | ArticleT;

export const getArticlePageProps: GetServerSideProps<ArticlePageProps> =
  async ({ res, params }): Promise<{ props: ArticlePageProps }> => {
    const db = AdminApp.firestore();
    if (!params?.slug || Array.isArray(params.slug)) {
      res.statusCode = 404;
      return { props: { error: 'bad article params' } };
    }
    let dbres;
    try {
      dbres = await db.collection('a').where('s', '==', params.slug).get();
    } catch {
      return { props: { error: 'error getting article' } };
    }
    const article = validate(dbres.docs[0]?.data());
    if (!article) {
      res.statusCode = 404;
      return { props: { error: 'article doesnt exist' } };
    }
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    return { props: article };
  };

export async function convertComments(
  comments: Array<CommentWithRepliesT>
): Promise<Array<Comment>> {
  return Promise.all(
    comments.map(async (c) => {
      return {
        commentText: c.c,
        authorId: c.a,
        authorDisplayName: c.n,
        authorSolveTime: c.t,
        authorCheated: c.ch,
        authorSolvedDownsOnly: c.do || false,
        publishTime: c.p.toMillis(),
        id: c.i,
        replies: await convertComments(c.r || []),
        ...(c.un && { authorUsername: c.un }),
        authorIsPatron: await isUserPatron(c.a),
      };
    })
  );
}

export interface PuzzlePageResultProps {
  puzzle: PuzzleResultWithAugmentedComments;
  profilePicture?: string | null;
  coverImage?: string | null;
  nextPuzzle?: NextPuzzleLink;
  embedOptions?: EmbedOptionsT;
}

export type PuzzlePageProps = PuzzlePageResultProps | PageErrorProps;

export const getPuzzlePageProps: GetServerSideProps<PuzzlePageProps> = async ({
  res,
  params,
}): Promise<{ props: PuzzlePageProps }> => {
  const db = AdminApp.firestore();
  let puzzle: PuzzleResultWithAugmentedComments | null = null;
  if (!params?.puzzleId || Array.isArray(params.puzzleId)) {
    res.statusCode = 404;
    return { props: { error: 'bad puzzle params' } };
  }
  let dbres;
  try {
    dbres = await db.collection('c').doc(params.puzzleId).get();
  } catch {
    return { props: { error: 'error getting puzzle' } };
  }
  if (!dbres.exists) {
    res.statusCode = 404;
    return { props: { error: 'puzzle doesnt exist' } };
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (isRight(validationResult)) {
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    const fromDB = puzzleFromDB(validationResult.right);
    puzzle = {
      ...fromDB,
      id: dbres.id,
      constructorPage: await userIdToPage(validationResult.right.a),
      constructorIsPatron: await isUserPatron(validationResult.right.a),
      comments: await convertComments(fromDB.comments),
    };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return { props: { error: 'invalid puzzle' } };
  }

  let profilePicture: string | null = null;
  let coverImage: string | null = null;
  if (puzzle.constructorPage?.u) {
    profilePicture = await getStorageUrl(
      `users/${puzzle.constructorPage.u}/profile.jpg`
    );
    coverImage = await getStorageUrl(
      `users/${puzzle.constructorPage.u}/${puzzle.id}/cover.jpg`
    );
  }

  // Get puzzle to show as next link after this one is finished
  let minis: CategoryIndexT;
  try {
    minis = await getDailyMinis();
  } catch {
    return {
      props: {
        puzzle,
        profilePicture,
        coverImage,
      },
    };
  }
  const puzzleId = puzzle.id;
  const today = getDateString(new Date());
  const miniDate = Object.keys(minis).find((key) => minis[key] === puzzleId);
  if (miniDate && addZeros(miniDate) <= addZeros(today)) {
    const previous = Object.entries(minis)
      .map(([k, v]): [string, string] => [addZeros(k), v])
      .filter(([k, _v]) => k < addZeros(miniDate))
      .sort((a, b) => (a[0] > b[0] ? -1 : 1));
    if (previous.length && previous[0]) {
      return {
        props: {
          puzzle,
          profilePicture,
          coverImage,
          nextPuzzle: {
            puzzleId: previous[0][1],
            linkText: 'the previous daily mini crossword',
          },
        },
      };
    }
  }
  const todaysMini = minis[today];
  // Didn't find a previous mini, link to today's
  return {
    props: {
      puzzle,
      profilePicture,
      coverImage,
      ...(todaysMini && {
        nextPuzzle: {
          puzzleId: todaysMini,
          linkText: "today's daily mini crossword",
        },
      }),
    },
  };
};
