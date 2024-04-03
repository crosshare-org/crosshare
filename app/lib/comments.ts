import {
  CommentForModerationWithIdT,
  CommentWithRepliesT,
  DBPuzzleT,
  DBPuzzleV,
} from './dbtypes';
import { getFromDB } from './dbUtils';

function findCommentById(
  comments: CommentWithRepliesT[],
  id: string
): CommentWithRepliesT | null {
  for (const comment of comments) {
    if (comment.i === id) {
      return comment;
    }
    if (comment.r !== undefined) {
      const res = findCommentById(comment.r, id);
      if (res !== null) {
        return res;
      }
    }
  }
  return null;
}

export async function moderateComments(
  commentsForModeration: CommentForModerationWithIdT[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteCfm: (commentId: string) => Promise<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatePuzzle: (puzzleId: string, update: any) => Promise<any>
) {
  const puzzles: Record<string, DBPuzzleT> = {};
  if (commentsForModeration.length) {
    for (const comment of commentsForModeration) {
      delete comment.approved;
      delete comment.needsModeration;
      if (comment.rejected) {
        comment.deleted = true;
        comment.removed = true;
      }
      delete comment.rejected;
      let puzzle: DBPuzzleT | null = null;
      const fromCache = puzzles[comment.pid];
      if (fromCache) {
        puzzle = fromCache;
      } else {
        try {
          puzzle = await getFromDB('c', comment.pid, DBPuzzleV);
          puzzles[comment.pid] = puzzle;
        } catch {
          puzzle = null;
        }
      }
      if (puzzle) {
        if (puzzle.cs === undefined) {
          puzzle.cs = [];
        }
        if (comment.rt === null) {
          if (!puzzle.cs.find((existing) => existing.i === comment.i)) {
            puzzle.cs.push(comment);
          }
        } else {
          const parent = findCommentById(puzzle.cs, comment.rt);
          if (parent === null) {
            throw new Error('parent comment not found');
          }
          if (parent.r) {
            if (!parent.r.find((existing) => existing.i === comment.i)) {
              parent.r.push(comment);
            }
          } else {
            parent.r = [comment];
          }
        }
      }
      await deleteCfm(comment.i);
    }
  }

  // Now we've merged in all the comments, so update the puzzles:
  for (const [puzzleId, dbPuzzle] of Object.entries(puzzles)) {
    await updatePuzzle(puzzleId, { cs: dbPuzzle.cs });
  }
}
