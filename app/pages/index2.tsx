/** @jsx jsx */
import { jsx } from '@emotion/react';

import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { FaUser, FaUserLock } from 'react-icons/fa';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { AuthContext } from '../components/AuthContext';
import { DBPuzzleV } from '../helpers/dbtypes';
import { App, TimestampClass } from '../helpers/firebase';
import { TopBar, TopBarLink } from '../components/TopBar';

type DailyMini = {
  id: string
}

interface HomePageProps {
  dailymini?: DailyMini
}

let lastFetched: { dailymini?: DailyMini, timestamp?: number } = {};
const TTL = 20 * 60 * 1000; // 20 min

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  if (lastFetched.dailymini && lastFetched.timestamp && (Date.now() - lastFetched.timestamp) < TTL) {
    console.log("got dailymini from cache");
    return { props: { dailymini: lastFetched.dailymini } };
  }

  const db = App.firestore();
  return db.collection('c').where('c', '==', 'dailymini')
    .where("p", "<", TimestampClass.now())
    .orderBy("p", "desc").limit(1).get().then((value) => {
      if (!value.size) {
        return { props: {} }
      }
      const data = value.docs[0].data();
      const validationResult = DBPuzzleV.decode(data);
      if (isRight(validationResult)) {
        console.log("got dailymini from db");
        const dm = { id: value.docs[0].id };
        lastFetched = { dailymini: dm, timestamp: Date.now() };
        return { props: { dailymini: dm } };
      } else {
        console.error(PathReporter.report(validationResult).join(","));
        return { props: {} };
      }
    }).catch(reason => {
      console.error(reason);
      return { props: {} };
    });
}

const Home = ({ dailymini }: HomePageProps) => {
  const { isAdmin } = React.useContext(AuthContext);
  if (!dailymini) {
    return <div>Missing mini</div>;
  }

  return <React.Fragment>
    <Head>
      <title>Crosshare - Free Crossword Constructor and Daily Mini Crossword Puzzles</title>
    </Head>
    <TopBar>
      {isAdmin ?
        <Link href='/admin' passHref>
          <TopBarLink icon={<FaUserLock />} text="Admin" />
        </Link>
        : ''}
      <Link href='/account' passHref>
        <TopBarLink icon={<FaUser />} text="Account" />
      </Link>
    </TopBar>
    <div css={{ margin: '1em', }}>
      <p css={{ marginBottom: '1em' }}>
        Crosshare is a new community for crossword constructors.
        We are just getting started so please let us know if you have any issues or suggestions.
      </p>
      <p><Link href='/crosswords/[puzzleId]' as={`/crosswords/${dailymini.id}`} passHref><a>Play today's daily mini crossword</a></Link></p>
      <p><Link href='/categories/[categoryId]' as='/categories/dailymini' passHref><a>Play previous daily minis</a></Link></p>
      <p css={{ marginTop: '1em' }}>For questions and discussion, join the <a target="_blank" rel="noopener noreferrer" href="https://groups.google.com/forum/#!forum/crosshare">Google Group</a>. Follow us on twitter <a target="_blank" rel="noopener noreferrer" href="https://twitter.com/crosshareapp">@crosshareapp</a>.</p>
    </div>
  </React.Fragment>
}

export default Home;
