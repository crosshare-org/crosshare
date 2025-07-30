import { orderBy, query, where } from 'firebase/firestore';
import Head from 'next/head';
import { useCallback, useMemo } from 'react';
import { AuthProps, requiresAuth } from '../components/AuthHelpers.js';
import { ButtonAsLink } from '../components/Buttons.js';
import { CreatePageForm } from '../components/ConstructorPage.js';
import { ConstructorStats } from '../components/ConstructorStats.js';
import { CreateShareSection } from '../components/CreateShareSection.js';
import { Link } from '../components/Link.js';
import { PuzzleResultLink } from '../components/PuzzleLink.js';
import { DefaultTopBar } from '../components/TopBar.js';
import { DBPuzzleT, DBPuzzleV } from '../lib/dbtypes.js';
import { getCollection } from '../lib/firebaseWrapper.js';
import { withStaticTranslation } from '../lib/translation.js';
import { puzzleFromDB } from '../lib/types.js';
import { usePaginatedQuery } from '../lib/usePagination.js';

export const getStaticProps = withStaticTranslation(() => {
  return { props: {} };
});

export const DashboardPage = ({ user, constructorPage }: AuthProps) => {
  const authoredQuery = useMemo(
    () =>
      query(
        getCollection('c'),
        where('a', '==', user.uid),
        orderBy('p', 'desc')
      ),
    [user.uid]
  );
  const authoredMapper = useCallback(
    (dbres: DBPuzzleT, id: string) => ({ ...puzzleFromDB(dbres, id), id }),
    []
  );
  const {
    loading: loadingAuthored,
    docs: authoredPuzzles,
    loadMore: loadMoreAuthored,
    hasMore: hasMoreAuthored,
    hasPrevious: hasPreviousAuthored,
    loadPrevious: loadPreviousAuthored,
  } = usePaginatedQuery(authoredQuery, DBPuzzleV, 8, authoredMapper);

  return (
    <>
      <Head>
        <title>{`Constructor Dashboard | Crosshare`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar dashboardSelected />
      <div className="margin1em">
        <CreateShareSection halfWidth={false} />
        <hr className="margin2em0" />
        <ConstructorStats userId={user.uid} />
        {authoredPuzzles.length ? (
          <>
            <hr className="margin2em0" />
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
                    Go to the <Link href="/account">account page</Link> to
                    change your blog settings.
                  </p>
                </>
              ) : (
                <></>
              )}
              <CreatePageForm
                className={constructorPage ? 'displayNone' : 'displayBlock'}
              />
              {authoredPuzzles.map((puzzle) => (
                <PuzzleResultLink
                  key={puzzle.id}
                  puzzle={{ ...puzzle, blogPostPreview: null }}
                  showAuthor={false}
                  showDate={true}
                  showPrivateStatus={true}
                  constructorPage={null}
                  constructorIsPatron={false}
                  filterTags={[]}
                />
              ))}
              {loadingAuthored ? (
                <p>Loading...</p>
              ) : (
                <>
                  {hasPreviousAuthored && (
                    <ButtonAsLink
                      onClick={loadPreviousAuthored}
                      text="&larr; Newer puzzles"
                    />
                  )}
                  {hasPreviousAuthored && hasMoreAuthored && <>&nbsp;|&nbsp;</>}
                  {hasMoreAuthored && (
                    <ButtonAsLink
                      onClick={loadMoreAuthored}
                      text="Older puzzles &rarr;"
                    />
                  )}
                </>
              )}
            </div>
          </>
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
