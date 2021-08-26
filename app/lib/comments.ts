import {
  CommentForModerationWithIdT,
  CommentWithRepliesT,
  DBPuzzleT,
  DBPuzzleV,
} from './dbtypes';
import { getFromDB } from './dbUtils';

function findCommentById(
  comments: Array<CommentWithRepliesT>,
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
  db: FirebaseFirestore.Firestore,
  commentsForModeration: Array<CommentForModerationWithIdT>,
  commentIdsForDeletion: Set<string>,
  autoModerating: boolean
) {
  const puzzles: Record<string, DBPuzzleT> = {};
  if (commentsForModeration) {
    for (const comment of commentsForModeration) {
      // Don't need to do anything for any comment that has been marked for deletion
      if (!commentIdsForDeletion.has(comment.i)) {
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
            puzzle.cs.push(comment);
          } else {
            const parent = findCommentById(puzzle.cs, comment.rt);
            if (parent === null) {
              throw new Error('parent comment not found');
            }
            if (parent.r) {
              parent.r.push(comment);
            } else {
              parent.r = [comment];
            }
          }
        }
      }
      await db.collection('cfm').doc(comment.i).delete();
      if (autoModerating) {
        db.collection('automoderated').doc(comment.i).create(comment);
      }
    }
  }

  // Now we've merged in all the comments, so update the puzzles:
  for (const [puzzleId, dbPuzzle] of Object.entries(puzzles)) {
    console.log('updating', puzzleId, dbPuzzle.cs);
    await db.collection('c').doc(puzzleId).update({ cs: dbPuzzle.cs });
  }
}
