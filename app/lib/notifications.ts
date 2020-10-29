import * as t from 'io-ts';

import { timestamp } from './timestamp';

import { DBPuzzleV, DBPuzzleT, CommentWithRepliesT } from './dbtypes';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AdminApp, AdminTimestamp } from './firebaseWrapper';
import add from 'date-fns/add';

const NotificationBaseV = t.type({
  /** doc id for this notification. should be idempotent since function might trigger multiple times */
  id: t.string,
  /** user id receiving the notification */
  u: t.string,
  /** timestamp when this should be displayed after (could be in the future) */
  t: timestamp,
  /** has the notification been seen (or emailed) */
  r: t.boolean,
  /** has the notification been considered for an email (maybe not sent due to unsub) */
  e: t.boolean,
});

// New puzzle by an author you follow
const NewPuzzleV = t.intersection([
  NotificationBaseV,
  t.type({
    /** kind of notification */
    k: t.literal('newpuzzle'),
    /** puzzle id */
    p: t.string,
    /** puzzle name */
    pn: t.string,
    /** author name */
    an: t.string,
  }),
]);
export type NewPuzzleNotificationT = t.TypeOf<typeof NewPuzzleV>;
export function isNewPuzzleNotification(
  e: NotificationT
): e is NewPuzzleNotificationT {
  return e.k === 'newpuzzle';
}

// Comment on a puzzle you authored
const CommentV = t.intersection([
  NotificationBaseV,
  t.type({
    /** kind of notification */
    k: t.literal('comment'),
    /** puzzle id */
    p: t.string,
    /** puzzle name */
    pn: t.string,
    /** comment id */
    c: t.string,
    /** commenter's name */
    cn: t.string,
  }),
]);
export type CommentNotificationT = t.TypeOf<typeof CommentV>;
export function isCommentNotification(
  e: NotificationT
): e is CommentNotificationT {
  return e.k === 'comment';
}

// Reply to a comment you wrote
const ReplyV = t.intersection([
  NotificationBaseV,
  t.type({
    /** kind of notification */
    k: t.literal('reply'),
    /** puzzle id */
    p: t.string,
    /** puzzle name */
    pn: t.string,
    /** comment id */
    c: t.string,
    /** commenter's name */
    cn: t.string,
  }),
]);
export type ReplyNotificationT = t.TypeOf<typeof ReplyV>;
export function isReplyNotification(e: NotificationT): e is ReplyNotificationT {
  return e.k === 'reply';
}

// One of your puzzles is marked as featured or daily mini
const FeaturedV = t.intersection([
  NotificationBaseV,
  t.type({
    /** kind of notification */
    k: t.literal('featured'),
    /** puzzle id */
    p: t.string,
    /** puzzle name */
    pn: t.string,
    /** featured as (e.g. 'daily mini for october 10th') */
    as: t.union([t.string, t.null]),
  }),
]);
export type FeaturedNotificationT = t.TypeOf<typeof FeaturedV>;
export function isFeaturedNotification(
  e: NotificationT
): e is FeaturedNotificationT {
  return e.k === 'featured';
}

export const NotificationV = t.union([NewPuzzleV, ReplyV, CommentV, FeaturedV]);
export type NotificationT = t.TypeOf<typeof NotificationV>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePuzzle(docdata: any): DBPuzzleT | null {
  const validationResult = DBPuzzleV.decode(docdata);
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
}

type PuzzleWithID = DBPuzzleT & { id: string };

const COMMENT_DELAY = { hours: 1 };
export function commentNotification(
  comment: CommentWithRepliesT,
  puzzle: PuzzleWithID
): CommentNotificationT {
  return {
    id: `${puzzle.a}-comment-${comment.i}`,
    u: puzzle.a,
    t: AdminTimestamp.fromDate(add(new Date(), COMMENT_DELAY)),
    r: false,
    e: false,
    k: 'comment',
    p: puzzle.id,
    pn: puzzle.t,
    c: comment.i,
    cn: comment.n,
  };
}

export function replyNotification(
  comment: CommentWithRepliesT,
  parent: CommentWithRepliesT,
  puzzle: PuzzleWithID
): ReplyNotificationT {
  return {
    id: `${parent.a}-reply-${comment.i}`,
    u: parent.a,
    t: AdminTimestamp.fromDate(add(new Date(), COMMENT_DELAY)),
    r: false,
    e: false,
    k: 'reply',
    p: puzzle.id,
    pn: puzzle.t,
    c: comment.i,
    cn: comment.n,
  };
}

export function newPuzzleNotification(
  puzzle: PuzzleWithID,
  followerId: string
): NewPuzzleNotificationT {
  return {
    id: `${followerId}-newpuzzle-${puzzle.id}`,
    u: followerId,
    t: puzzle.pvu || AdminTimestamp.now(),
    r: false,
    e: false,
    k: 'newpuzzle',
    p: puzzle.id,
    pn: puzzle.t,
    an: puzzle.n,
  };
}

export function featuredNotification(
  puzzle: PuzzleWithID,
  as: string | null
): FeaturedNotificationT {
  return {
    id: `featured-${puzzle.id}`,
    u: puzzle.a,
    t: AdminTimestamp.now(),
    r: false,
    e: false,
    k: 'featured',
    p: puzzle.id,
    pn: puzzle.t,
    as,
  };
}

function checkComments(
  after: Array<CommentWithRepliesT>,
  before: Array<CommentWithRepliesT> | undefined,
  puzzle: PuzzleWithID,
  parent?: CommentWithRepliesT
): Array<NotificationT> {
  const notifications: Array<NotificationT> = [];
  for (const comment of after) {
    const beforeComment = before?.find(
      (beforeComment) => beforeComment.i === comment.i
    );
    if (!beforeComment) {
      // Don't notify on your own comment
      if (comment.a !== puzzle.a) {
        notifications.push(commentNotification(comment, puzzle));
      }
      // If it's your puzzle we already notified as a comment (not reply) above
      if (parent && comment.a !== parent.a && parent.a !== puzzle.a) {
        notifications.push(replyNotification(comment, parent, puzzle));
      }
    } else if (comment.r) {
      notifications.push(
        ...checkComments(comment.r, beforeComment.r, puzzle, comment)
      );
    }
  }
  return notifications;
}

const FollowersV = t.partial({
  /** follower user ids */
  f: t.array(t.string),
});

async function notificationsForPuzzleCreation(
  puzzle: DBPuzzleT,
  puzzleId: string
): Promise<Array<NewPuzzleNotificationT>> {
  console.log('checking for puzzle creation', `followers/${puzzle.a}`);
  if (puzzle.pv) {
    return [];
  }
  const db = AdminApp.firestore();
  const followersRes = await db.doc(`followers/${puzzle.a}`).get();
  if (!followersRes.exists) {
    console.log('no followers doc');
    return [];
  }

  const validationResult = FollowersV.decode(followersRes.data());
  if (!isRight(validationResult)) {
    console.error('could not decode followers for', puzzle.a);
    console.error(PathReporter.report(validationResult).join(','));
    return [];
  }
  const followers = validationResult.right.f;
  if (!followers) {
    console.log('no followers');
    return [];
  }
  console.log(followers.length, 'followers');
  return followers.map((followerId) =>
    newPuzzleNotification({ ...puzzle, id: puzzleId }, followerId)
  );
}

export async function notificationsForPuzzleChange(
  beforeData: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  afterData: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  puzzleId: string
): Promise<Array<NotificationT>> {
  const after = parsePuzzle(afterData);
  if (!after) {
    console.error('Missing/invalid after doc', afterData);
    return [];
  }
  if (beforeData === undefined) {
    return notificationsForPuzzleCreation(after, puzzleId);
  }
  const before = parsePuzzle(beforeData);
  if (!before) {
    console.error('Missing/invalid before doc', beforeData, afterData);
    return [];
  }

  const withID = { ...after, id: puzzleId };
  const notifications = [];
  if (after.cs) {
    notifications.push(...checkComments(after.cs, before.cs, withID));
  }

  if (after.f && !before.f) {
    notifications.push(featuredNotification(withID, null));
  } else if (after.c === 'dailymini' && !before.c && after.dmd) {
    notifications.push(
      featuredNotification(withID, `the daily mini for ${after.dmd}`)
    );
  }

  return notifications;
}
