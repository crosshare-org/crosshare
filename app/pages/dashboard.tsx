import { AuthProps, requiresAuth } from '../components/AuthContext';
import Head from 'next/head';
import { DefaultTopBar } from '../components/TopBar';
import { CreateShareSection } from '../components/CreateShareSection';
import { useCallback, useMemo } from 'react';
import { App } from '../lib/firebaseWrapper';
import { puzzleFromDB } from '../lib/types';
import { usePaginatedQuery } from '../lib/usePagination';
import { DBPuzzleV } from '../lib/dbtypes';
import { PuzzleResultLink } from '../components/PuzzleLink';
import { ButtonAsLink } from '../components/Buttons';
import { Link } from '../components/Link';
import { CreatePageForm } from '../components/ConstructorPage';
import { ConstructorStats } from '../components/ConstructorStats';

export const DashboardPage = ({ user, constructorPage }: AuthProps) => {
  const db = App.firestore();
  const authoredQuery = useMemo(
    () => db.collection('c').where('a', '==', user.uid).orderBy('p', 'desc'),
    [db, user.uid]
  );
  const authoredMapper = useCallback(
    async (dbres, id) => ({ ...puzzleFromDB(dbres), id }),
    []
  );
  const {
    loading: loadingAuthored,
    docs: authoredPuzzles,
    loadMore: loadMoreAuthored,
    hasMore: hasMoreAuthored,
  } = usePaginatedQuery(authoredQuery, DBPuzzleV, 8, authoredMapper);

  return (
    <>
      <Head>
        <title>Constructor Dashboard | Crosshare</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar dashboardSelected />
      <div css={{ margin: '1em' }}>
        <CreateShareSection halfWidth={false} />
        <ConstructorStats userId={user.uid} />
        {authoredPuzzles.length ? (
          <div>
            <h2>Recent Puzzles</h2>
            {constructorPage ? (
              <>
                <p>
                  Your public puzzles are published on your blog:{' '}
                  <Link href={'/' + constructorPage.i}>
                    https://crosshare.org/{constructorPage.i}
                  </Link>
                </p>
                <p>
                  Go to the <Link href="/account">account page</Link> to change
                  your blog settings.
                </p>
              </>
            ) : (
              <></>
            )}
            <CreatePageForm
              css={{ display: constructorPage ? 'none' : 'block' }}
            />
            {authoredPuzzles.map((puzzle) => (
              <PuzzleResultLink
                key={puzzle.id}
                puzzle={puzzle}
                showAuthor={false}
                showDate={true}
                showPrivateStatus={true}
                constructorPage={null}
              />
            ))}
            {loadingAuthored ? (
              <p>Loading...</p>
            ) : (
              hasMoreAuthored && (
                <ButtonAsLink
                  onClick={loadMoreAuthored}
                  text="Older puzzles &rarr;"
                />
              )
            )}
          </div>
        ) : (
          <p>
            Crosshare makes it super simple to create and share crossword
            puzzles &mdash; use one of the buttons above to get started!
          </p>
        )}
      </div>
    </>
  );
};

export default requiresAuth(DashboardPage);
