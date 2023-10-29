import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { requiresAuth, AuthProps } from '../../components/AuthHelpers';
import { PuzzleResult, puzzleFromDB } from '../../lib/types';
import { PuzzleStatsT, PuzzleStatsV, DBPuzzleV } from '../../lib/dbtypes';
import { getFromSessionOrDB } from '../../lib/dbUtils';
import { ErrorPage } from '../../components/ErrorPage';
import { StatsPage } from '../../components/PuzzleStats';
import { useDocument } from 'react-firebase-hooks/firestore';
import { Link } from '../../components/Link';
import { slugify } from '../../lib/utils';
import { getDocRef } from '../../lib/firebaseWrapper';
import { withStaticTranslation } from '../../lib/translation';

export const getStaticProps = withStaticTranslation(() => {
  return { props: {} };
});

export default requiresAuth((props: AuthProps) => {
  const router = useRouter();
  const { puzzleId } = router.query;
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!puzzleId) {
    return <div />;
  }
  if (Array.isArray(puzzleId)) {
    return <ErrorPage title="Bad Puzzle Id" />;
  }
  return <PuzzleLoader key={puzzleId} puzzleId={puzzleId} auth={props} />;
});

// export for testing
export const PuzzleLoader = ({
  puzzleId,
  auth,
}: {
  puzzleId: string;
  auth: AuthProps;
}) => {
  const puzRef = useRef(getDocRef('c', puzzleId));
  const [doc, loading, error] = useDocument(puzRef.current);
  const [puzzle, puzzleDecodeError] = useMemo(() => {
    if (doc === undefined) {
      return [undefined, undefined];
    }
    if (!doc.exists()) {
      return [null, undefined];
    }
    const validationResult = DBPuzzleV.decode(
      doc.data({ serverTimestamps: 'previous' })
    );
    if (isRight(validationResult)) {
      const puzzle = validationResult.right;
      return [puzzle, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'failed to decode puzzle'];
    }
  }, [doc]);

  if (error || puzzleDecodeError) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>{error?.message || puzzleDecodeError}</p>
      </ErrorPage>
    );
  }
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!puzzle) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>Failed to load the puzzle!</p>
      </ErrorPage>
    );
  }

  const nicePuzzle: PuzzleResult = { ...puzzleFromDB(puzzle), id: puzzleId };

  if (!auth.isAdmin && auth.user.uid !== nicePuzzle.authorId) {
    return (
      <ErrorPage title="Not Allowed">
        <p>You do not have permission to view this page</p>
      </ErrorPage>
    );
  }

  return <StatsLoader key={puzzleId} puzzle={nicePuzzle} />;
};

const StatsLoader = ({ puzzle }: { puzzle: PuzzleResult }) => {
  const [stats, setStats] = useState<PuzzleStatsT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [didLoad, setDidLoad] = useState<boolean>(false);

  useEffect(() => {
    let didCancel = false;

    const fetchData = async () => {
      getFromSessionOrDB({
        collection: 's',
        docId: puzzle.id,
        validator: PuzzleStatsV,
        ttl: 30 * 60 * 1000,
      })
        .then((s) => {
          if (didCancel) {
            return;
          }
          setStats(s);
          setDidLoad(true);
        })
        .catch((e) => {
          if (didCancel) {
            return;
          }
          setError(e);
          setDidLoad(true);
        });
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [puzzle.id]);

  if (error) {
    return (
      <ErrorPage title="Error Loading Stats">
        <p>
          Either something went wrong, or we don&apos;t have stats for this
          puzzle yet. Stats are updated once per hour, and won&apos;t be
          available until after a non-author has solved the puzzle.
        </p>
        <p>
          <Link href={`/crosswords/${puzzle.id}/${slugify(puzzle.title)}`}>
            Take me to the puzzle page
          </Link>
        </p>
      </ErrorPage>
    );
  }
  if (!didLoad) {
    return <div>Loading stats...</div>;
  }

  return <StatsPage puzzle={puzzle} stats={stats} />;
};
