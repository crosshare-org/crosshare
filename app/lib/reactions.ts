import { setDoc } from 'firebase/firestore';
import * as t from 'io-ts';
import { getDocRef } from './firebaseWrapper';
import { fromLocalStorage } from './storage';
import { ServerPuzzleResult, fromEnum } from './types';

export enum PuzzleReaction {
  Like = 'like',
}

export const ReactionV = t.type({
  /** user id */
  u: t.string,
  /** puzzle id */
  p: t.string,
  /** kind */
  k: fromEnum('PuzzleReaction', PuzzleReaction),
  /** true for set, false for unset */
  s: t.boolean,
});

export type ReactionT = t.TypeOf<typeof ReactionV>;

const StorageV = t.record(t.string, t.boolean);

function storageKey(userId: string, kind: PuzzleReaction) {
  return `reaction:${userId}:${kind}`;
}

export function firebaseKey(reaction: ReactionT) {
  return `${reaction.u}-${reaction.k}-${reaction.p}`;
}

export function savedReactions(
  kind: PuzzleReaction,
  puzzle: ServerPuzzleResult
) {
  switch (kind) {
    case PuzzleReaction.Like:
      return puzzle.likes;
  }
}

export function getReaction(
  kind: PuzzleReaction,
  puzzle: ServerPuzzleResult,
  userId: string
): boolean {
  const key = storageKey(userId, kind);
  const storage = fromLocalStorage(key, StorageV);
  const fromStorage = storage?.[puzzle.id];
  const fromPuzzle = savedReactions(kind, puzzle).includes(userId);

  if (fromStorage !== undefined) {
    if (fromStorage === fromPuzzle && storage) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete storage[puzzle.id];
      localStorage.setItem(key, JSON.stringify(storage));
    }
    return fromStorage;
  }

  return fromPuzzle;
}

export async function setReaction(
  kind: PuzzleReaction,
  set: boolean,
  puzzleId: string,
  userId: string
) {
  const key = storageKey(userId, kind);
  const storage = fromLocalStorage(key, StorageV) || {};
  storage[puzzleId] = set;
  localStorage.setItem(key, JSON.stringify(storage));

  const reaction: ReactionT = {
    u: userId,
    p: puzzleId,
    k: kind,
    s: set,
  };
  return setDoc(getDocRef('reaction', firebaseKey(reaction)), reaction);
}
