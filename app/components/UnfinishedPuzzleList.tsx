import { useMemo, useCallback } from 'react';

import type firebase from 'firebase/app';
import { LegacyPlayT, LegacyPlayV } from '../lib/dbtypes';
import { App } from '../lib/firebaseWrapper';
import { PuzzleResultLink } from '../components/PuzzleLink';
import { getPuzzle } from '../lib/puzzleCache';
import { puzzleFromDB } from '../lib/types';
import { ButtonAsLink } from '../components/Buttons';
import { Trans, t } from '@lingui/macro';

import { usePaginatedQuery } from '../lib/usePagination';

export function UnfinishedPuzzleList({
  user,
}: {
  user: firebase.User | undefined;
}) {
  const db = App.firestore();
  const unfinishedQuery = useMemo(
    () =>
      user &&
      db
        .collection('p')
        .where('u', '==', user.uid)
        .where('f', '==', false)
        .orderBy('ua', 'desc'),
    [db, user]
  );
  const playMapper = useCallback(
    async (play: LegacyPlayT) => {
      const puzzleId = play.c;
      const puzzle = await getPuzzle(puzzleId);
      if (!puzzle || puzzle.a === play.u) {
        console.log('deleting invalid play');
        await db.collection('p').doc(`${puzzleId}-${play.u}`).delete();
        return undefined;
      } else {
        return { ...puzzleFromDB(puzzle), id: puzzleId };
      }
    },
    [db]
  );
  const {
    loading: loadingUnfinished,
    docs: unfinishedPuzzles,
    loadMore: loadMoreUnfinished,
    hasMore: hasMoreUnfinished,
  } = usePaginatedQuery(unfinishedQuery, LegacyPlayV, 4, playMapper);

  if (unfinishedPuzzles.length) {
    return (
      <>
        <h2><Trans>Unfinished Solves</Trans></h2>
        {unfinishedPuzzles.map((puzzle) => (
          <PuzzleResultLink
            key={puzzle.id}
            puzzle={puzzle}
            showAuthor={false}
            constructorPage={null}
          />
        ))}
        {loadingUnfinished ? (
          <p><Trans>Loading...</Trans></p>
        ) : (
          hasMoreUnfinished && (
            <ButtonAsLink
              onClick={loadMoreUnfinished}
              text={t`Older unfinished solves` + ' →'}
            />
          )
        )}
      </>
    );
  }
  return <></>;
}
