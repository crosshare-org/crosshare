import * as t from 'io-ts';
import { useEffect, useState } from 'react';
import type { firestore } from 'firebase';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

export function usePaginatedQuery<A, N>(
  query: firestore.Query,
  validator: t.Type<A>,
  limit: number,
  mapper: (val: A, docid: string) => Promise<N | undefined>
) {
  const [after, setAfter] = useState<firestore.QueryDocumentSnapshot | null>(null);
  const [docs, setDocs] = useState<Array<N>>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastLoaded, setLastLoaded] = useState<firestore.QueryDocumentSnapshot | null>(null);

  // when "after" changes, we update our query
  useEffect(() => {
    let didCancel = false;

    const fetchData = async () => {
      console.log('Doing fetch');
      let q = query;
      if (after) {
        q = q.startAfter(after);
      }
      q.limit(limit).get()
        .then(async dbres => {
          if (didCancel) {
            return;
          }
          if (dbres.docs.length < limit) {
            setHasMore(false);
          }
          setLastLoaded(dbres.docs[dbres.docs.length - 1]);
          const results: Array<N> = [];
          for (const doc of dbres.docs) {
            const data = doc.data();
            const validationResult = validator.decode(data);
            if (isRight(validationResult)) {
              const res = await (mapper(validationResult.right, doc.id));
              if (res !== undefined) {
                results.push(res);
              }
            }
            else {
              console.error(PathReporter.report(validationResult).join(','));
              return Promise.reject('Malformed content');
            }
          }
          setLoading(false);
          setDocs(results);
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
    loadMore
  };
}
