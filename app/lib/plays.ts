import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { App, TimestampClass, TimestampType } from './firebaseWrapper';
import { puzzleTitle } from './types';
import { DBPuzzleV, PlayWithoutUserV, PlayWithoutUserT, PlayT, LegacyPlayV, downloadOptionallyTimestamped } from './dbtypes';

const PlayMapV = t.record(t.string, PlayWithoutUserV);
export type PlayMapT = t.TypeOf<typeof PlayMapV>;

export const TimestampedPlayMapV = downloadOptionallyTimestamped(PlayMapV);
export type TimestampedPlayMapT = t.TypeOf<typeof TimestampedPlayMapV>;
const PlayTTL = 10 * 60 * 1000;

export async function getPlays(user: firebase.User | undefined): Promise<PlayMapT> {
  let plays: PlayMapT = {};
  let lastUpdated: TimestampType | null = null;

  const storageKey = user ? 'plays/' + user.uid : 'plays/logged-out';
  const inStorage = localStorage.getItem(storageKey);
  if (inStorage) {
    const validationResult = TimestampedPlayMapV.decode(JSON.parse(inStorage));
    if (isRight(validationResult)) {
      console.log('loaded ' + storageKey + ' from local storage');
      const valid = validationResult.right;
      plays = valid.data;
      lastUpdated = valid.downloadedAt;
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      return Promise.reject('Couldn\'t parse object in local storage');
    }
  }

  const now = new Date();
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

  return query.get()
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
      return plays;
    });
}

export async function writePlayToDB(user: firebase.User, play: PlayWithoutUserT): Promise<void> {
  const docId = play.c + '-' + user.uid;
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

  plays[play.c] = play;

  const forLS: TimestampedPlayMapT = {
    downloadedAt: lastUpdated,
    data: plays
  };
  localStorage.setItem(storageKey, JSON.stringify(forLS));
}
