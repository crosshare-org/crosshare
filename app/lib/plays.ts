import equal from 'fast-deep-equal';
import type { User } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';
import * as t from 'io-ts';
import {
  LegacyPlayV,
  PlayT,
  PlayWithoutUserT,
  PlayWithoutUserV,
  downloadOptionallyTimestamped,
} from './dbtypes';
import { getDocRef } from './firebaseWrapper';
import { PathReporter } from './pathReporter';
import { fromLocalStorage } from './storage';

const PlayMapV = t.record(t.string, t.union([PlayWithoutUserV, t.null]));
export type PlayMapT = t.TypeOf<typeof PlayMapV>;

export const TimestampedPlayMapV = downloadOptionallyTimestamped(PlayMapV);
export type TimestampedPlayMapT = t.TypeOf<typeof TimestampedPlayMapV>;

const dirtyPlays = new Set<string>();

export function isDirty(user: User, puzzleId: string) {
  const docId = puzzleId + '-' + user.uid;
  return dirtyPlays.has(docId);
}

let memoryStore: Record<string, TimestampedPlayMapT> = {};

export function resetMemoryStore() {
  memoryStore = {};
}

function getStorageKey(user: User | undefined) {
  return user ? 'plays/' + user.uid : 'plays/logged-out';
}

function getStore(storageKey: string): PlayMapT {
  const store = memoryStore[storageKey];
  if (store) {
    return store.data;
  }
  const valid = fromLocalStorage(storageKey, TimestampedPlayMapV);
  if (valid) {
    memoryStore[storageKey] = valid;
    return valid.data;
  }
  return {};
}

export function getPlayFromCache(
  user: User | undefined,
  puzzleId: string
): PlayWithoutUserT | null | undefined {
  const storageKey = getStorageKey(user);
  const store = getStore(storageKey);
  return store[puzzleId];
}

export async function getPossiblyStalePlay(
  user: User | undefined,
  puzzleId: string
): Promise<PlayWithoutUserT | null> {
  const cached = getPlayFromCache(user, puzzleId);
  if (cached !== undefined && cached !== null) {
    return cached;
  }
  if (!user) {
    return null;
  }
  return getPlayFromDB(user, puzzleId);
}

export async function getPlayFromDB(
  user: User,
  puzzleId: string
): Promise<PlayWithoutUserT | null> {
  console.log(`getting play p/${puzzleId}-${user.uid} from db`);
  const dbres = await getDoc(getDocRef('p', `${puzzleId}-${user.uid}`));

  if (!dbres.exists()) {
    cachePlay(user, puzzleId, null, true);
    return null;
  }

  const playResult = LegacyPlayV.decode(dbres.data());
  if (playResult._tag === 'Right') {
    const play = {
      ...playResult.right,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      n: playResult.right.n || 'Title unknown',
    };
    cachePlay(user, puzzleId, play, true);
    return play;
  } else {
    console.error(PathReporter.report(playResult).join(','));
    return Promise.reject(new Error('Malformed play'));
  }
}

export async function writePlayToDB(
  user: User,
  puzzleId: string
): Promise<void> {
  if (!isDirty(user, puzzleId)) {
    return Promise.reject(new Error('trying to write to db but play is clean'));
  }

  const storageKey = getStorageKey(user);
  const store = getStore(storageKey);
  const play: PlayWithoutUserT | null | undefined = store[puzzleId];
  if (!play) {
    return Promise.reject(new Error('no cached play!'));
  }

  const docId = puzzleId + '-' + user.uid;
  dirtyPlays.delete(docId);
  const dbPlay: PlayT = { ...play, u: user.uid };
  return setDoc(getDocRef('p', docId), dbPlay);
}

export function cachePlay(
  user: User | undefined,
  puzzleId: string,
  play: PlayWithoutUserT | null,
  isClean?: boolean
): void {
  const storageKey = getStorageKey(user);
  const store = getStore(storageKey);

  function omitUa(p: PlayWithoutUserT | null) {
    if (!p) {
      return null;
    }
    const { ua, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  }
  const storedPlay = store[puzzleId];
  if (storedPlay && equal(omitUa(storedPlay), omitUa(play))) {
    return;
  }

  store[puzzleId] = play;
  const forLS: TimestampedPlayMapT = {
    downloadedAt: null,
    data: store,
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify(forLS));
  } catch {
    /* iframed and incogito */
    console.warn('not caching play, error on LS');
  }
  memoryStore[storageKey] = forLS;

  if (user && play && !isClean) {
    const docId = puzzleId + '-' + user.uid;
    dirtyPlays.add(docId);
  }
}
