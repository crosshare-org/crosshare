import { Trans, t } from '@lingui/macro';
import type { User } from 'firebase/auth';
import { deleteDoc, orderBy, query, where } from 'firebase/firestore';
import { useMemo, useCallback } from 'react';
import { ButtonAsLink } from '../components/Buttons';
import { PuzzleResultLink } from '../components/PuzzleLink';
import { LegacyPlayT, LegacyPlayV } from '../lib/dbtypes';
import { getCollection, getDocRef } from '../lib/firebaseWrapper';
import { getPuzzle } from '../lib/puzzleCache';
import { puzzleFromDB } from '../lib/types';
import { usePaginatedQuery } from '../lib/usePagination';

export function UnfinishedPuzzleList({ user }: { user: User | undefined }) {
  const unfinishedQuery = useMemo(
    () =>
      user &&
      query(
        getCollection('p'),
        where('u', '==', user.uid),
        where('f', '==', false),
        orderBy('ua', 'desc')
      ),
    [user]
  );
  const playMapper = useCallback(async (play: LegacyPlayT) => {
    const puzzleId = play.c;
    const puzzle = await getPuzzle(puzzleId);
    if (!puzzle || puzzle.a === play.u) {
      console.log('deleting invalid play');
      await deleteDoc(getDocRef('p', `${puzzleId}-${play.u}`));
      return undefined;
    } else {
      return { ...puzzleFromDB(puzzle), id: puzzleId };
    }
  }, []);
  const {
    loading: loadingUnfinished,
    docs: unfinishedPuzzles,
    loadMore: loadMoreUnfinished,
    hasMore: hasMoreUnfinished,
    hasPrevious: hasPreviousUnfinished,
    loadPrevious: loadPreviousUnfinished,
  } = usePaginatedQuery(unfinishedQuery, LegacyPlayV, 4, playMapper);

  if (unfinishedPuzzles.length) {
    return (
      <>
        <h2>
          <Trans>Unfinished Solves</Trans>
        </h2>
        {unfinishedPuzzles.map((puzzle) => (
          <PuzzleResultLink
            key={puzzle.id}
            puzzle={{ ...puzzle, blogPostPreview: null }}
            showAuthor={false}
            constructorPage={null}
            constructorIsPatron={false}
            filterTags={[]}
          />
        ))}
        {loadingUnfinished ? (
          <p>
            <Trans>Loading...</Trans>
          </p>
        ) : (
          <>
            {hasPreviousUnfinished && (
              <ButtonAsLink
                onClick={loadPreviousUnfinished}
                text={'← ' + t`Newer unfinished solves`}
              />
            )}
            {hasPreviousUnfinished && hasMoreUnfinished && <>&nbsp;|&nbsp;</>}
            {hasMoreUnfinished && (
              <ButtonAsLink
                onClick={loadMoreUnfinished}
                text={t`Older unfinished solves` + ' →'}
              />
            )}
          </>
        )}
      </>
    );
  }
  return <></>;
}
