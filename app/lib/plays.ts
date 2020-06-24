import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import equal from 'fast-deep-equal';

import { App, TimestampClass, TimestampType } from './firebaseWrapper';
import { puzzleTitle } from './types';
import { DBPuzzleV, PlayWithoutUserV, PlayWithoutUserT, PlayT, LegacyPlayV, downloadOptionallyTimestamped } from './dbtypes';

const PlayMapV = t.record(t.string, PlayWithoutUserV);
export type PlayMapT = t.TypeOf<typeof PlayMapV>;

export const TimestampedPlayMapV = downloadOptionallyTimestamped(PlayMapV);
export type TimestampedPlayMapT = t.TypeOf<typeof TimestampedPlayMapV>;
const PlayTTL = 10 * 60 * 1000;

const dirtyPlays = new Set<string>();

export function isDirty(user: firebase.User, puzzleId: string) {
  const docId = puzzleId + '-' + user.uid;
  return dirtyPlays.has(docId);
}

const memoryStore: Record<string, TimestampedPlayMapT> = {};
const currentQuery: Record<string, Promise<firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>>> = {};

export async function getPlays(user: firebase.User | undefined): Promise<PlayMapT> {
  const storageKey = user ? 'plays/' + user.uid : 'plays/logged-out';

  if (currentQuery[storageKey]) {
    // Wait for the current query to finish and then just snag the results from the memory store which will be updated
    return currentQuery[storageKey].then(() => {
      return memoryStore[storageKey].data;
    });
  }

  let plays: PlayMapT = {};
  let lastUpdated: TimestampType | null = null;
  const now = new Date();

  if (memoryStore[storageKey]) {
    const inMemory = memoryStore[storageKey];
    if (!user || (inMemory.downloadedAt && (now.getTime() < inMemory.downloadedAt.toDate().getTime() + PlayTTL))) {
      return Promise.resolve(inMemory.data);
    }
  }

  const inStorage = localStorage.getItem(storageKey);
  if (inStorage) {
    const validationResult = TimestampedPlayMapV.decode(JSON.parse(inStorage));
    if (isRight(validationResult)) {
      console.log('loaded ' + storageKey + ' from local storage');
      const valid = validationResult.right;
      plays = valid.data;
      lastUpdated = valid.downloadedAt;
      memoryStore[storageKey] = valid;
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      return Promise.reject('Couldn\'t parse object in local storage');
    }
  }

  if (!user || (lastUpdated && (now.getTime() < lastUpdated.toDate().getTime() + PlayTTL))) {
    // We either don't have a user or our cache is still valid - no need to go to db
    return Promise.resolve(plays);
  }

  console.log('updating ' + storageKey + ' from db');
  const db = App.firestore();
  const updateTo = TimestampClass.now();
  let query = db.collection('p').where('u', '==', user.uid).where('ua', '<=', updateTo);
  if (lastUpdated) {
    query = query.where('ua', '>', lastUpdated);
  }

  currentQuery[storageKey] = query.get();
  return currentQuery[storageKey]
    .then(async dbres => {
      console.log('loaded ' + dbres.size + ' plays from DB');
      for (const doc of dbres.docs) {
        const playResult = LegacyPlayV.decode(doc.data());
        if (isRight(playResult)) {
          const play = playResult.right;
          let title = play.n;
          if (!title) {
            const puzzleRes = await db.collection('c').doc(play.c).get();
            if (!puzzleRes.exists) {
              return Promise.reject('Tried getting title for ' + play.c + ' but failed');
            }
            const validationResult = DBPuzzleV.decode(puzzleRes.data());
            if (isRight(validationResult)) {
              title = puzzleTitle(validationResult.right);
            } else {
              console.error(PathReporter.report(validationResult).join(','));
              return Promise.reject('Malformed puzzle while getting title');
            }
          }
          plays[play.c] = { ...play, n: title };
        } else {
          console.error(PathReporter.report(playResult).join(','));
          return Promise.reject('Malformed play');
        }
      }

      const forLS: TimestampedPlayMapT = {
        downloadedAt: updateTo,
        data: plays
      };
      localStorage.setItem(storageKey, JSON.stringify(forLS));
      memoryStore[storageKey] = forLS;
      return plays;
    })
    .finally(() => {
      delete currentQuery[storageKey];
    });
}

export async function writePlayToDB(user: firebase.User, puzzleId: string): Promise<void> {
  if (!isDirty(user, puzzleId)) {
    return Promise.reject('trying to write to db but play is clean');
  }

  const storageKey = 'plays/' + user.uid;
  const inStorage = localStorage.getItem(storageKey);
  let play: PlayWithoutUserT | undefined = undefined;

  if (inStorage) {
    const validationResult = TimestampedPlayMapV.decode(JSON.parse(inStorage));
    if (isRight(validationResult)) {
      const valid = validationResult.right;
      play = valid.data[puzzleId];
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      return Promise.reject('could not parse plays in LS');
    }
  }

  if (!play) {
    return Promise.reject('no cached play!');
  }

  const docId = puzzleId + '-' + user.uid;
  dirtyPlays.delete(docId);
  const dbPlay: PlayT = { ...play, u: user.uid };
  const db = App.firestore();
  return db.collection('p').doc(docId).set(dbPlay);
}

export function cachePlay(user: firebase.User | undefined, play: PlayWithoutUserT): void {
  const storageKey = user ? 'plays/' + user.uid : 'plays/logged-out';
  const inStorage = localStorage.getItem(storageKey);
  let plays: PlayMapT = {};
  let lastUpdated: TimestampType | null = null;

  if (inStorage) {
    const validationResult = TimestampedPlayMapV.decode(JSON.parse(inStorage));
    if (isRight(validationResult)) {
      console.log('loaded ' + storageKey + ' from local storage');
      const valid = validationResult.right;
      plays = valid.data;
      lastUpdated = valid.downloadedAt;
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      throw new Error('Couldn\'t parse object in local storage');
    }
  }

  function omitUa(p: PlayWithoutUserT) {
    const { ua, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  }

  if (plays[play.c]) {
    if (equal(omitUa(plays[play.c]), omitUa(play))) {
      return;
    }
  }

  if (user) {
    const docId = play.c + '-' + user.uid;
    dirtyPlays.add(docId);
  }
  plays[play.c] = play;

  const forLS: TimestampedPlayMapT = {
    downloadedAt: lastUpdated,
    data: plays
  };
  memoryStore[storageKey] = forLS;
  localStorage.setItem(storageKey, JSON.stringify(forLS));
}
