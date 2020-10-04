import * as t from 'io-ts';

import { timestamp } from './timestamp';

import { DBPuzzleV, DBPuzzleT, CommentWithRepliesT } from './dbtypes';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { AdminTimestamp } from './firebaseWrapper';
import add from 'date-fns/add';

export const NotificationV = t.intersection([
  t.type({
    /** doc id for this notification. should be idempotent since function might trigger multiple times */
    id: t.string,
    /** user id receiving the notification */
    u: t.string,
    /** timestamp when this should be displayed after (could be in the future) */
    t: timestamp,
    /** has the notification been seen (or emailed) */
    r: t.boolean,
  }),
  t.union([
    // Comment on a puzzle you authored
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
    // Reply to a comment you wrote
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
  ])
]);
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
function commentNotification(comment: CommentWithRepliesT, puzzle: PuzzleWithID): NotificationT {
  return {
    id: `comment-${comment.i}`,
    u: puzzle.a,
    t: AdminTimestamp.fromDate(add(new Date(), COMMENT_DELAY)),
    r: false,
    k: 'comment',
    p: puzzle.id,
    pn: puzzle.t,
    c: comment.i,
    cn: comment.n,
  };
}

function replyNotification(comment: CommentWithRepliesT, parent: CommentWithRepliesT, puzzle: PuzzleWithID): NotificationT {
  return {
    id: `reply-${comment.i}`,
    u: parent.a,
    t: AdminTimestamp.fromDate(add(new Date(), COMMENT_DELAY)),
    r: false,
    k: 'reply',
    p: puzzle.id,
    pn: puzzle.t,
    c: comment.i,
    cn: comment.n,
  };
}

function checkComments(after: Array<CommentWithRepliesT>, before: Array<CommentWithRepliesT> | undefined, puzzle: PuzzleWithID, parent?: CommentWithRepliesT): Array<NotificationT> {
  const notifications: Array<NotificationT> = [];
  for (const comment of after) {
    const beforeComment = before ?.find(beforeComment => beforeComment.i === comment.i);
    if (!beforeComment) {
      // Don't notify on your own comment
      if (comment.a !== puzzle.a) {
        notifications.push(commentNotification(comment, puzzle));
      }
      // Add a reply notification if it's not going to the puzzle's author (who is already getting the one above)
      // But don't notify on a reply to yourself
      if (parent && parent.a !== puzzle.a && comment.a !== parent.a) {
        notifications.push(replyNotification(comment, parent, puzzle));
      }
    } else if (comment.r) {
      notifications.push(...checkComments(comment.r, beforeComment.r, puzzle, comment));
    }
  }
  return notifications;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function notificationsForPuzzleChange(beforeData: any, afterData: any, puzzleId: string): Array<NotificationT> {
  const before = parsePuzzle(beforeData);
  const after = parsePuzzle(afterData);
  if (!before || !after) {
    console.error('Missing/invalid before or after doc', beforeData, afterData);
    return [];
  }
  if (!after.cs) {
    return [];
  }
  return checkComments(after.cs, before.cs, { ...after, id: puzzleId });
}
