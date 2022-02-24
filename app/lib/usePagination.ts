import * as t from 'io-ts';
import { useEffect, useState } from 'react';
import type firebase from 'firebase/compat/app';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

export function usePaginatedQuery<A, N>(
  query: firebase.firestore.Query | undefined,
  validator: t.Type<A>,
  limit: number,
  mapper: (val: A, docid: string) => Promise<N | undefined>
) {
  const [
    after,
    setAfter,
  ] = useState<firebase.firestore.QueryDocumentSnapshot | null>(null);
  const [docs, setDocs] = useState<Array<N>>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [
    lastLoaded,
    setLastLoaded,
  ] = useState<firebase.firestore.QueryDocumentSnapshot | null>(null);

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
        q = q.startAfter(after);
      }
      q.limit(limit)
        .get()
        .then(async (dbres) => {
          if (didCancel) {
            return;
          }
          if (dbres.docs.length < limit) {
            setHasMore(false);
          }
          setLastLoaded(dbres.docs[dbres.docs.length - 1] || null);
          const results: Array<N> = [];
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
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [after, limit, query, validator, mapper]);

  function loadMore() {
    setAfter(lastLoaded);
    setLoading(true);
  }

  return {
    loading,
    docs,
    hasMore,
    loadMore,
  };
}
