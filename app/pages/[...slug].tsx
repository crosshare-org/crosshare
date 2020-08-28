import { GetServerSideProps } from 'next';
import { useContext } from 'react';

import { AuthContext } from '../components/AuthContext';
import { ConstructorPage, ConstructorPageProps } from '../components/ConstructorPage';
import { validate, CONSTRUCTOR_PAGE_COLLECTION } from '../lib/constructorPage';
import { puzzleFromDB } from '../lib/types';
import { DBPuzzleV } from '../lib/dbtypes';
import { mapEachResult, } from '../lib/dbUtils';
import { ErrorPage } from '../components/ErrorPage';
import { App, TimestampClass } from '../lib/firebaseWrapper';

interface ErrorProps {
  error: string
}
type PageProps = ConstructorPageProps | ErrorProps;

const PAGESIZE = 10;

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ res, params }) => {
  if (!params || !Array.isArray(params.slug)) {
    console.error('bad constructor page params');
    res.statusCode = 404;
    return { props: { error: 'Bad username' } };
  }

  const username = params.slug[0].toLowerCase();

  const db = App.firestore();
  let dbres;
  try {
    dbres = await db.collection(CONSTRUCTOR_PAGE_COLLECTION).doc(username).get();
  } catch {
    return { props: { error: 'Error loading constructor page' } };
  }
  if (!dbres.exists) {
    return { props: { error: 'Page does not exist' } };
  }

  const cp = validate(dbres.data(), username);
  if (!cp) {
    return { props: { error: 'Invalid constructor page' } };
  }

  try {
    let q = db.collection('c').where('a', '==', cp.u).orderBy('p', 'desc').limit(PAGESIZE + 1);
    let startTs: number | null = null;
    if (params.slug.length > 1) {
      startTs = parseInt(params.slug[1]);
      q = q.startAfter(TimestampClass.fromMillis(startTs));
    }
    const puzzles = await mapEachResult(q, DBPuzzleV, (dbpuzz, docId) => {
      return { ...puzzleFromDB(dbpuzz), id: docId };
    });
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    return {
      props: {
        constructor: cp,
        puzzles: puzzles.slice(0, PAGESIZE),
        hasMore: puzzles.length === PAGESIZE + 1,
        currentIndex: startTs,
      }
    };
  } catch (e) {
    console.error(e);
    return { props: { error: 'Error loading puzzles' } };
  }
};

export default function ConstructorPageHandler(props: PageProps) {
  const authProps = useContext(AuthContext);

  if ('error' in props) {
    return <ErrorPage title='Something Went Wrong'>
      <p>Sorry! Something went wrong while loading that page.</p>
      {props.error ? <p>{props.error}</p> : ''}
    </ErrorPage>;
  }
  return <ConstructorPage {...props} {...authProps} />;
}
