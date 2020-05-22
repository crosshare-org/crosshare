import * as t from "io-ts";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";
import { App, TimestampClass } from './firebase';

import { downloadTimestamped } from './dbtypes';

export async function setInCache<A>(
  collection: string,
  docId: string,
  value: A,
  validator: t.Type<A>,
  sendToDB: boolean
) {
  const sessionKey = collection + "/" + docId;
  const TimestampedV = downloadTimestamped(validator);
  const forLS: t.TypeOf<typeof TimestampedV> = {
    downloadedAt: TimestampClass.now(),
    data: value
  };
  sessionStorage.setItem(sessionKey, JSON.stringify(forLS));
  if (sendToDB) {
    const db = App.firestore();
    await db.collection(collection).doc(docId).set(value).then(() => {
      console.log('Set new value for ' + collection + '/' + docId);
    });
  }
}

export async function updateInCache<A>(
  collection: string,
  docId: string,
  update: Partial<A>,
  validator: t.Type<A>,
  sendToDB: boolean
) {
  const sessionKey = collection + "/" + docId;
  const inSession = sessionStorage.getItem(sessionKey);
  const TimestampedV = downloadTimestamped(validator);
  if (inSession) {
    const validationResult = TimestampedV.decode(JSON.parse(inSession));
    if (isRight(validationResult)) {
      const updated = { ...validationResult.right.data, ...update };
      const forLS: t.TypeOf<typeof TimestampedV> = {
        downloadedAt: validationResult.right.downloadedAt,
        data: updated,
      };
      sessionStorage.setItem(sessionKey, JSON.stringify(forLS));
    } else {
      console.error("Couldn't parse object in local storage");
      console.error(PathReporter.report(validationResult).join(","));
    }
  }
  if (sendToDB) {
    const db = App.firestore();
    await db.collection(collection).doc(docId).set(update, { merge: true }).then(() => {
      console.log('Updated for ' + collection + '/' + docId);
    });
  }
}

export async function mapEachResult<N, A>(
  query: firebase.firestore.Query<firebase.firestore.DocumentData>,
  validator: t.Type<A>,
  mapper: (val: A, docid: string) => N
): Promise<Array<N>> {
  const value = await query.get();
  const results: Array<N> = [];
  value.forEach(doc => {
    const data = doc.data();
    const validationResult = validator.decode(data);
    if (isRight(validationResult)) {
      results.push(mapper(validationResult.right, doc.id));
    }
    else {
      console.error(PathReporter.report(validationResult).join(","));
      return Promise.reject('Malformed content');
    }
  });
  return results;
}

// TODO WHERE ARE THESE firebase TYPES COMING FROM?
export async function getValidatedAndDelete<A>(
  query: firebase.firestore.Query<firebase.firestore.DocumentData>,
  validator: t.Type<A>,
): Promise<Array<A>> {
  const value = await query.get();
  const results: Array<A> = [];
  const deletes: Array<Promise<void>> = [];
  value.forEach(doc => {
    const data = doc.data();
    const validationResult = validator.decode(data);
    if (isRight(validationResult)) {
      results.push(validationResult.right);
      deletes.push(doc.ref.delete());
    }
    else {
      console.error(PathReporter.report(validationResult).join(","));
      return Promise.reject('Malformed content');
    }
  });
  await Promise.all(deletes);
  return results;
}

export async function getFromDB<A>(
  collection: string,
  docId: string,
  validator: t.Type<A>,
): Promise<A> {
  const db = App.firestore();
  const dbres = await db.collection(collection).doc(docId).get();
  if (!dbres.exists) {
    return Promise.reject('Missing doc');
  }
  const validationResult = validator.decode(dbres.data());
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(","));
    return Promise.reject('Malformed content');
  }
}

export async function getFromSessionOrDB<A>(
  collection: string,
  docId: string,
  validator: t.Type<A>,
  ttl: number,
): Promise<A | null> {
  const now = new Date();
  const sessionKey = collection + "/" + docId;
  const inSession = sessionStorage.getItem(sessionKey);
  const TimestampedV = downloadTimestamped(validator);
  if (inSession) {
    const validationResult = TimestampedV.decode(JSON.parse(inSession));
    if (isRight(validationResult)) {
      const valid = validationResult.right;
      if (ttl === -1 || (now.getTime() < valid.downloadedAt.toDate().getTime() + ttl)) {
        console.log('loaded ' + sessionKey + ' from local storage');
        return valid.data;
      } else {
        console.log("object in local storage has expired");
      }
    } else {
      console.error("Couldn't parse object in local storage");
      console.error(PathReporter.report(validationResult).join(","));
    }
  }
  console.log('loading ' + sessionKey + ' from db');
  const db = App.firestore();
  const dbres = await db.collection(collection).doc(docId).get();
  if (!dbres.exists) {
    console.log(sessionKey + ' is non existent');
    return null;
  }
  const validationResult = validator.decode(dbres.data());
  if (isRight(validationResult)) {
    console.log("loaded, and caching in storage");
    const forLS: t.TypeOf<typeof TimestampedV> = {
      downloadedAt: TimestampClass.now(),
      data: validationResult.right
    };
    sessionStorage.setItem(sessionKey, JSON.stringify(forLS));
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(","));
    return Promise.reject('Malformed content');
  }
}
