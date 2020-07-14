import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { getDailyMinis } from '../lib/dailyMinis';
import { Link } from '../components/Link';
import { puzzleFromDB, PuzzleResult } from '../lib/types';
import { DBPuzzleV, getDateString } from '../lib/dbtypes';
import { App, TimestampClass } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import { PuzzleLink, PuzzleResultLink } from '../components/PuzzleLink';

type DailyMini = {
  id: string,
  authorName: string,
}

interface HomePageProps {
  dailymini: DailyMini,
  featured: Array<PuzzleResult>
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

  return Promise.all([dailyminiQuery, featuredQuery]).then(([dmResult, featuredResult]) => {
    const featured = featuredResult.docs.map((doc) => {
      const res = DBPuzzleV.decode(doc.data());
      if (isRight(res)) {
        return { ...puzzleFromDB(res.right), id: doc.id };
      } else {
        console.error(PathReporter.report(res).join(','));
        throw new Error('Bad puzzle querying for featured');
      }
    });
    const data = dmResult.data();
    const validationResult = DBPuzzleV.decode(data);
    if (isRight(validationResult)) {
      res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
      const dm = { id: dmResult.id, authorName: validationResult.right.n };
      return { props: { dailymini: dm, featured } };
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      throw new Error('Malformed daily mini');
    }
  });
};

export default function HomePage({ dailymini, featured }: HomePageProps) {
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
      <PuzzleLink id={dailymini.id} title="Today's daily mini crossword">
        <p>by {dailymini.authorName}</p>
        <p><Link href='/categories/[categoryId]' as='/categories/dailymini' passHref>Play previous daily minis</Link></p>
      </PuzzleLink>
      <h2>Share a Puzzle</h2>
      <p><Link href='/upload' as='/upload' passHref>Upload a .puz to get a Crosshare link to share with solvers</Link></p>
      <h2>Featured Puzzles</h2>
      {featured.map((p, i) => <PuzzleResultLink key={i} puzzle={p} />)}
      <p css={{ marginTop: '1em' }}>For questions and discussion, join the <a target="_blank" rel="noopener noreferrer" href="https://groups.google.com/forum/#!forum/crosshare">Google Group</a>. Follow us on twitter <a target="_blank" rel="noopener noreferrer" href="https://twitter.com/crosshareapp">@crosshareapp</a>.</p>
    </div >
  </>;
}
