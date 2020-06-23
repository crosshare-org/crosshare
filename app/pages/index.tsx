import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { Link } from '../components/Link';
import { DBPuzzleV } from '../lib/dbtypes';
import { App, TimestampClass } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';

type DailyMini = {
  id: string
}

interface HomePageProps {
  dailymini?: DailyMini
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({ res }) => {
  const db = App.firestore();
  return db.collection('c').where('c', '==', 'dailymini')
    .where('p', '<', TimestampClass.now())
    .orderBy('p', 'desc').limit(1).get().then((value) => {
      if (!value.size) {
        return { props: {} };
      }
      const data = value.docs[0].data();
      const validationResult = DBPuzzleV.decode(data);
      if (isRight(validationResult)) {
        res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
        const dm = { id: value.docs[0].id };
        return { props: { dailymini: dm } };
      } else {
        console.error(PathReporter.report(validationResult).join(','));
        return { props: {} };
      }
    }).catch(reason => {
      console.error(reason);
      return { props: {} };
    });
};

export default function HomePage({ dailymini }: HomePageProps) {
  if (!dailymini) {
    return <div>Missing mini</div>;
  }

  return <>
    <Head>
      <title>Crosshare - Free Crossword Constructor and Daily Mini Crossword Puzzles</title>
    </Head>

    <DefaultTopBar />

    <div css={{ margin: '1em', }}>
      <p css={{ marginBottom: '1em' }}>
        Crosshare is a new community for crossword constructors.
        We are just getting started so please let us know if you have any issues or suggestions.
      </p>
      <p><Link href='/crosswords/[puzzleId]' as={`/crosswords/${dailymini.id}`} passHref>Play today&apos;s daily mini crossword</Link></p>
      <p><Link href='/categories/[categoryId]' as='/categories/dailymini' passHref>Play previous daily minis</Link></p>
      <p css={{ marginTop: '1em' }}>For questions and discussion, join the <a target="_blank" rel="noopener noreferrer" href="https://groups.google.com/forum/#!forum/crosshare">Google Group</a>. Follow us on twitter <a target="_blank" rel="noopener noreferrer" href="https://twitter.com/crosshareapp">@crosshareapp</a>.</p>
    </div>
  </>;
}
