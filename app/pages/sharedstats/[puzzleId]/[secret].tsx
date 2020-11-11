import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { DBPuzzleV, PuzzleStatsT, PuzzleStatsV } from '../../../lib/dbtypes';
import { puzzleFromDB, PuzzleResult } from '../../../lib/types';
import { StatsPage } from '../../../components/PuzzleStats';
import { GetServerSideProps } from 'next';
import { AdminApp } from '../../../lib/firebaseWrapper';

interface PageProps {
  puzzle: PuzzleResult;
  stats: Omit<PuzzleStatsT, 'ua'>;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({
  res,
  params,
}) => {
  const db = AdminApp.firestore();
  const secret = params?.secret;
  if (
    !params?.puzzleId ||
    Array.isArray(params.puzzleId) ||
    !secret ||
    Array.isArray(secret)
  ) {
    console.error('bad params');
    return { notFound: true };
  }
  let dbres;
  try {
    dbres = await db.collection('c').doc(params.puzzleId).get();
  } catch {
    console.error('error getting puzzle');
    return { notFound: true };
  }
  if (!dbres.exists) {
    console.error('no puzzle');
    return { notFound: true };
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (!isRight(validationResult)) {
    console.error(PathReporter.report(validationResult).join(','));
    return { notFound: true };
  }
  const puzzle = {
    ...puzzleFromDB(validationResult.right),
    id: dbres.id,
  };

  try {
    dbres = await db.collection('s').doc(params.puzzleId).get();
  } catch {
    console.error('error getting stats');
    return { notFound: true };
  }
  if (!dbres.exists) {
    console.error('no stats');
    return { notFound: true };
  }
  const statsVR = PuzzleStatsV.decode(dbres.data());
  if (!isRight(statsVR)) {
    console.error(PathReporter.report(statsVR).join(','));
    return { notFound: true };
  }
  const stats = statsVR.right;

  if (!stats.sct || stats.sct !== secret) {
    console.error('bad secret');
    return { notFound: true };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ua, ...statsRem } = stats;
  res.setHeader('Cache-Control', 'public, max-age=1000, s-maxage=1000');
  return { props: { stats: statsRem, puzzle } };
};

export default function SharedStatsPage(props: PageProps) {
  return <StatsPage {...props} hideShare={true} />;
}
