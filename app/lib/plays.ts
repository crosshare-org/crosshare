import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import equal from 'fast-deep-equal';

import { App } from './firebaseWrapper';
import { PlayWithoutUserT, PlayWithoutUserV, LegacyPlayV, downloadOptionallyTimestamped, PlayT } from './dbtypes';

const PlayMapV = t.record(t.string, t.union([PlayWithoutUserV, t.null]));
export type PlayMapT = t.TypeOf<typeof PlayMapV>;

export const TimestampedPlayMapV = downloadOptionallyTimestamped(PlayMapV);
export type TimestampedPlayMapT = t.TypeOf<typeof TimestampedPlayMapV>;

const dirtyPlays = new Set<string>();

export function isDirty(user: firebase.User, puzzleId: string) {
  const docId = puzzleId + '-' + user.uid;
  return dirtyPlays.has(docId);
}

let memoryStore: Record<string, TimestampedPlayMapT> = {};

export function resetMemoryStore() {
  memoryStore = {};
}

function getStorageKey(user: firebase.User | undefined) {
  return user ? 'plays/' + user.uid : 'plays/logged-out';
}

function getStore(storageKey: string): PlayMapT {
  if (memoryStore[storageKey]) {
    return memoryStore[storageKey].data;
  }
  const inStorage = localStorage.getItem(storageKey);
  if (inStorage) {
    const validationResult = TimestampedPlayMapV.decode(JSON.parse(inStorage));
    if (isRight(validationResult)) {
      console.log('loaded ' + storageKey + ' from local storage');
      const valid = validationResult.right;
      memoryStore[storageKey] = valid;
      return valid.data;
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      throw new Error('Couldn\'t parse object in local storage');
    }
  }
  return {};
}

export function getPlayFromCache(user: firebase.User | undefined, puzzleId: string): PlayWithoutUserT | null | undefined {
  const storageKey = getStorageKey(user);
  const store = getStore(storageKey);
  return store[puzzleId];
}

export async function getPossiblyStalePlay(user: firebase.User | undefined, puzzleId: string): Promise<PlayWithoutUserT | null> {
  const cached = getPlayFromCache(user, puzzleId);
  if (cached !== undefined) {
    return cached;
  }
  if (!user) {
    return cached || null;
  }
  return getPlayFromDB(user, puzzleId);
}

export async function getPlayFromDB(user: firebase.User, puzzleId: string): Promise<PlayWithoutUserT | null> {
  console.log(`getting play p/${puzzleId}-${user.uid} from db`);
  const db = App.firestore();
  const dbres = await db.doc(`p/${puzzleId}-${user.uid}`).get();

  if (!dbres.exists) {
    cachePlay(user, puzzleId, null, true);
    return null;
  }

  const playResult = LegacyPlayV.decode(dbres.data());
  if (isRight(playResult)) {
    const play = { ...playResult.right, n: playResult.right.n || 'Title unknown' };
    cachePlay(user, puzzleId, play, true);
    return play;
  } else {
    console.error(PathReporter.report(playResult).join(','));
    return Promise.reject('Malformed play');
  }
}

export async function writePlayToDB(user: firebase.User, puzzleId: string): Promise<void> {
  if (!isDirty(user, puzzleId)) {
    return Promise.reject('trying to write to db but play is clean');
  }

  const storageKey = getStorageKey(user);
  const store = getStore(storageKey);
  const play: PlayWithoutUserT | null | undefined = store[puzzleId];
  if (!play) {
    return Promise.reject('no cached play!');
  }

  const docId = puzzleId + '-' + user.uid;
  dirtyPlays.delete(docId);
  const dbPlay: PlayT = { ...play, u: user.uid };
  const db = App.firestore();
  return db.collection('p').doc(docId).set(dbPlay);
}

export function cachePlay(user: firebase.User | undefined, puzzleId: string, play: PlayWithoutUserT | null, isClean?: boolean): void {
  const storageKey = getStorageKey(user);
  const store = getStore(storageKey);

  function omitUa(p: PlayWithoutUserT | null) {
    if (!p) {
      return null;
    }
    const { ua, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  }
  if (store[puzzleId] && equal(omitUa(store[puzzleId]), omitUa(play))) {
    return;
  }

  store[puzzleId] = play;
  const forLS: TimestampedPlayMapT = {
    downloadedAt: null,
    data: store
  };
  localStorage.setItem(storageKey, JSON.stringify(forLS));
  memoryStore[storageKey] = forLS;

  if (user && play && !isClean) {
    const docId = puzzleId + '-' + user.uid;
    dirtyPlays.add(docId);
  }
}
