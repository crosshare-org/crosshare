import * as t from 'io-ts';
import { useEffect, useState } from 'react';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  Query,
  QueryDocumentSnapshot,
  endBefore,
  startAfter,
  query as fbQuery,
  limit as fbLimit,
  limitToLast as fbLimitToLast,
  getDocs,
} from 'firebase/firestore';
import { logAsyncErrors } from './utils';

export function usePaginatedQuery<A, N>(
  query: Query | undefined,
  validator: t.Type<A>,
  limit: number,
  mapper: (val: A, docid: string) => N | undefined | Promise<N | undefined>
) {
  const [before, setBefore] = useState<QueryDocumentSnapshot | null>(null);
  const [after, setAfter] = useState<QueryDocumentSnapshot | null>(null);
  const [docs, setDocs] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [previousPages, setPreviousPages] = useState(0);
  const [firstLoaded, setFirstLoaded] = useState<QueryDocumentSnapshot | null>(
    null
  );
  const [lastLoaded, setLastLoaded] = useState<QueryDocumentSnapshot | null>(
    null
  );

  // when "after" changes, we update our query
  useEffect(() => {
    let didCancel = false;

    if (!query) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      console.log('Doing fetch');
      let q = query;
      if (after) {
        q = fbQuery(fbQuery(q, startAfter(after)), fbLimit(limit));
      }
      if (before) {
        q = fbQuery(fbQuery(q, endBefore(before)), fbLimitToLast(limit));
      }
      if (!after && !before) {
        q = fbQuery(q, fbLimit(limit));
      }

      await getDocs(q).then(async (dbres) => {
        if (didCancel) {
          return;
        }
        if (dbres.docs.length < limit) {
          setHasMore(false);
        }
        if (previousPages === 0) {
          setHasPrevious(false);
        }
        setLastLoaded(dbres.docs[dbres.docs.length - 1] ?? null);
        setFirstLoaded(dbres.docs[0] ?? null);
        const results: N[] = [];
        for (const doc of dbres.docs) {
          const data = doc.data();
          const validationResult = validator.decode(data);
          if (isRight(validationResult)) {
            const res = await mapper(validationResult.right, doc.id);
            if (res !== undefined) {
              results.push(res);
            }
          } else {
            console.error(PathReporter.report(validationResult).join(','));
            return Promise.reject('Malformed content');
          }
        }
        setLoading(false);
        setDocs(results);
        return;
      });
    };
    logAsyncErrors(fetchData)();
    return () => {
      didCancel = true;
    };
  }, [after, before, limit, query, validator, mapper, previousPages]);

  function loadMore() {
    setAfter(lastLoaded);
    setBefore(null);
    setLoading(true);
    setHasPrevious(true);
    setPreviousPages(previousPages + 1);
  }

  function loadPrevious() {
    setBefore(firstLoaded);
    setAfter(null);
    setLoading(true);
    setPreviousPages(Math.max(previousPages - 1, 0));
    setHasMore(true);
  }

  return {
    loading,
    docs,
    hasMore,
    loadMore,
    hasPrevious,
    loadPrevious,
  };
}
