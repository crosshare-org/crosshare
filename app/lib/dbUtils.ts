import { Query, deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import * as t from 'io-ts';
import { downloadTimestamped } from './dbtypes';
import { getDocRef } from './firebaseWrapper';
import { PathReporter } from './pathReporter';
import { Timestamp } from './timestamp';

interface CacheSetOptionsRequired<A> {
  collection: string;
  value: A;
  validator: t.Type<A>;
}
interface YesDB {
  sendToDB: true;
  docId: string;
  localDocId?: string;
}
interface NoDBButDocId {
  sendToDB: false;
  docId: string;
  localDocId?: string;
}
interface NoDBButLocalId {
  sendToDB: false;
  docId?: string;
  localDocId: string;
}
type CacheSetOptions<A> = CacheSetOptionsRequired<A> &
  (YesDB | NoDBButDocId | NoDBButLocalId);

export async function setInCache<A>({
  collection,
  docId,
  localDocId,
  value,
  validator,
  sendToDB,
}: CacheSetOptions<A>) {
  const sessionKey = localDocId
    ? collection + '/' + localDocId
    : collection + '/' + docId;
  const TimestampedV = downloadTimestamped(validator);
  const forLS: t.TypeOf<typeof TimestampedV> = {
    downloadedAt: Timestamp.now(),
    data: value,
  };
  sessionStorage.setItem(sessionKey, JSON.stringify(forLS));
  if (sendToDB && docId) {
    return setDoc(getDocRef(collection, docId), value).then(() => {
      console.log('Set new value for ' + collection + '/' + docId);
    });
  }
}

export async function getValidatedAndDelete<A>(
  query: Query,
  validator: t.Type<A>
): Promise<A[]> {
  const value = await getDocs(query);
  const results: A[] = [];
  const deletes: Promise<void>[] = [];
  for (const doc of value.docs) {
    const data = doc.data();
    const validationResult = validator.decode(data);
    if (validationResult._tag === 'Right') {
      results.push(validationResult.right);
      deletes.push(deleteDoc(doc.ref));
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      return Promise.reject(new Error('Malformed content'));
    }
  }
  await Promise.all(deletes);
  return results;
}

export async function getFromDB<A>(
  collection: string,
  docId: string,
  validator: t.Type<A>
): Promise<A> {
  const dbres = await getDoc(getDocRef(collection, docId));
  if (!dbres.exists()) {
    return Promise.reject(new Error('Missing doc'));
  }
  const validationResult = validator.decode(dbres.data());
  if (validationResult._tag === 'Right') {
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return Promise.reject(new Error('Malformed content'));
  }
}

interface CacheOrDBGetOptions<A> {
  collection: string;
  docId: string;
  localDocId?: string;
  validator: t.Type<A>;
  ttl: number;
}

export async function getFromSessionOrDB<A>({
  collection,
  docId,
  localDocId,
  validator,
  ttl,
}: CacheOrDBGetOptions<A>): Promise<A | null> {
  const now = new Date();
  const sessionKey = localDocId
    ? collection + '/' + localDocId
    : collection + '/' + docId;
  const inSession = sessionStorage.getItem(sessionKey);
  const TimestampedV = downloadTimestamped(validator);
  if (inSession) {
    const validationResult = TimestampedV.decode(JSON.parse(inSession));
    if (validationResult._tag === 'Right') {
      const valid = validationResult.right;
      if (
        ttl === -1 ||
        now.getTime() < valid.downloadedAt.toDate().getTime() + ttl
      ) {
        console.log('loaded ' + sessionKey + ' from local storage');
        return valid.data;
      } else {
        console.log('object in local storage has expired');
      }
    } else {
      console.error("Couldn't parse object in local storage");
      console.error(PathReporter.report(validationResult).join(','));
    }
  }
  console.log('loading ' + sessionKey + ' from db');
  const dbres = await getDoc(getDocRef(collection, docId));
  if (!dbres.exists()) {
    console.log(sessionKey + ' is non existent');
    return null;
  }
  const validationResult = validator.decode(dbres.data());
  if (validationResult._tag === 'Right') {
    console.log('loaded, and caching in storage');
    const forLS: t.TypeOf<typeof TimestampedV> = {
      downloadedAt: Timestamp.now(),
      data: validationResult.right,
    };
    sessionStorage.setItem(sessionKey, JSON.stringify(forLS));
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return Promise.reject(new Error('Malformed content'));
  }
}
