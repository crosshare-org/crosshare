import { GetServerSideProps } from 'next';
import { StatsPage } from '../../../components/PuzzleStats.js';
import {
  DBPuzzleV,
  PuzzleStatsV,
  PuzzleStatsViewT,
} from '../../../lib/dbtypes.js';
import { getCollection } from '../../../lib/firebaseAdminWrapper.js';
import { PathReporter } from '../../../lib/pathReporter.js';
import { PuzzleResult, puzzleFromDB } from '../../../lib/types.js';

interface PageProps {
  puzzle: Omit<PuzzleResult, 'comments'>;
  stats: PuzzleStatsViewT;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({
  res,
  params,
}) => {
  const secret = params?.secret;
  if (
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    !params?.puzzleId ||
    Array.isArray(params.puzzleId) ||
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    !secret ||
    Array.isArray(secret)
  ) {
    console.error('bad params');
    return { notFound: true };
  }
  let dbres;
  try {
    dbres = await getCollection('c').doc(params.puzzleId).get();
  } catch {
    console.error('error getting puzzle');
    return { notFound: true };
  }
  if (!dbres.exists) {
    console.error('no puzzle');
    return { notFound: true };
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (validationResult._tag !== 'Right') {
    console.error(PathReporter.report(validationResult).join(','));
    return { notFound: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { comments, ...puzzle } = {
    ...puzzleFromDB(validationResult.right),
    id: dbres.id,
  };

  try {
    dbres = await getCollection('s').doc(params.puzzleId).get();
  } catch {
    console.error('error getting stats');
    return { notFound: true };
  }
  if (!dbres.exists) {
    console.error('no stats');
    return { notFound: true };
  }
  const statsVR = PuzzleStatsV.decode(dbres.data());
  if (statsVR._tag !== 'Right') {
    console.error(PathReporter.report(statsVR).join(','));
    return { notFound: true };
  }
  const stats = statsVR.right;

  if (!stats.sct || stats.sct !== secret) {
    console.error('bad secret');
    return { notFound: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ua, ct_subs, ...statsRem } = stats;

  res.setHeader('Cache-Control', 'public, max-age=1000, s-maxage=1000');
  return {
    props: {
      stats: {
        ...(ct_subs?.length && {
          ct_subs: ct_subs.map((n) => ({
            ...n,
            t: typeof n.t === 'number' ? n.t : n.t.toMillis(),
          })),
        }),
        ...statsRem,
      },
      puzzle,
    },
  };
};

export default function SharedStatsPage(props: PageProps) {
  return <StatsPage {...props} hideShare={true} />;
}
