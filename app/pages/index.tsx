import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { getDailyMinis } from '../lib/dailyMinis';
import { Link } from '../components/Link';
import { puzzleFromDB, ServerPuzzleResult } from '../lib/types';
import { DBPuzzleV, getDateString } from '../lib/dbtypes';
import { App, TimestampClass } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import { PuzzleResultLink } from '../components/PuzzleLink';
import { userIdToPage } from '../lib/constructorPage';

interface HomePageProps {
  dailymini: ServerPuzzleResult,
  featured: Array<ServerPuzzleResult>
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({ res }) => {
  const db = App.firestore();
  const minis = await getDailyMinis();
  const today = getDateString(new Date());
  if (!minis[today]) {
    throw new Error('no mini scheduled for today!');
  }
  // TODO if we start saving author name/id in category doc we no longer need this extra query
  const dailyminiQuery = db.collection('c').doc(minis[today]).get();

  const featuredQuery = db.collection('c').where('m', '==', true).where('f', '==', true)
    .where('p', '<', TimestampClass.now())
    .orderBy('p', 'desc').limit(20).get();

  return Promise.all([dailyminiQuery, featuredQuery]).then(async ([dmResult, featuredResult]) => {
    const featured = await Promise.all(featuredResult.docs.map(async (doc) => {
      const res = DBPuzzleV.decode(doc.data());
      if (isRight(res)) {
        return { ...puzzleFromDB(res.right), id: doc.id, constructorPage: await userIdToPage(res.right.a) };
      } else {
        console.error(PathReporter.report(res).join(','));
        throw new Error('Bad puzzle querying for featured');
      }
    }));
    const data = dmResult.data();
    const validationResult = DBPuzzleV.decode(data);
    if (isRight(validationResult)) {
      res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
      const dm = { ...puzzleFromDB(validationResult.right), id: dmResult.id, constructorPage: await userIdToPage(validationResult.right.a) };
      return { props: { dailymini: dm, featured } };
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      throw new Error('Malformed daily mini');
    }
  });
};

export default function HomePage({ dailymini, featured }: HomePageProps) {
  const today = new Date();
  return <>
    <Head>
      <title>Crosshare - Free Crossword Constructor and Daily Mini Crossword Puzzles</title>
    </Head>

    <DefaultTopBar />

    <div css={{ margin: '1em', }}>
      <p css={{ marginBottom: '1em' }}>
        Crosshare is the best place to create, share and solve crossword puzzles.
      </p>
      <h2>Daily Mini</h2>
      <PuzzleResultLink puzzle={dailymini} showAuthor={true} constructorPage={dailymini.constructorPage} title={'Today\'s daily mini crossword'} />
      <p><Link href='/dailyminis/[[...slug]]' as={`/dailyminis/${today.getUTCFullYear()}/${today.getUTCMonth() + 1}`} passHref>Play previous daily minis</Link></p>
      <h2>Create or Share a Puzzle</h2>
      <p><Link href='/construct' as='/construct' passHref>Construct a new puzzle with the Crosshare constructor</Link></p>
      <p><Link href='/upload' as='/upload' passHref>Upload a .puz to get a Crosshare link to share with solvers</Link></p>
      <h2>Featured Puzzles</h2>
      {featured.map((p, i) => <PuzzleResultLink key={i} puzzle={p} constructorPage={p.constructorPage} showAuthor={true} />)}
      <p css={{ marginTop: '1em', paddingBottom: '1em' }}>For questions and discussion, join the <a target="_blank" rel="noopener noreferrer" href="https://groups.google.com/forum/#!forum/crosshare">Google Group</a>. Follow us on twitter <a target="_blank" rel="noopener noreferrer" href="https://twitter.com/crosshareapp">@crosshareapp</a>.</p>
    </div >
  </>;
}
