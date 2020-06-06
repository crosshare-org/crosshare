import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { App, TimestampClass, TimestampType } from './firebaseWrapper';
import { PlayV, downloadTimestamped } from './dbtypes';

const PlayMapV = t.record(t.string, PlayV);
export type PlayMapT = t.TypeOf<typeof PlayMapV>;

export const TimestampedPlayMapV = downloadTimestamped(PlayMapV);
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
    .then(dbres => {
      console.log('loaded ' + dbres.size + ' plays from DB');
      dbres.forEach(doc => {
        const playResult = PlayV.decode(doc.data());
        if (isRight(playResult)) {
          plays[playResult.right.c] = playResult.right;
        } else {
          console.error('Skipping update for play due to malformed result');
          console.error(PathReporter.report(playResult).join(','));
        }
      });

      const forLS: TimestampedPlayMapT = {
        downloadedAt: updateTo,
        data: plays
      };
      localStorage.setItem(storageKey, JSON.stringify(forLS));
      return plays;
    });
}
