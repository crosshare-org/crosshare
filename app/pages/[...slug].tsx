import { GetServerSideProps } from 'next';
import { useEffect } from 'react';

import {
  ConstructorPage,
  ConstructorPageProps,
} from '../components/ConstructorPage';
import { validate } from '../lib/constructorPage';
import { ErrorPage } from '../components/ErrorPage';
import { AdminApp, App } from '../lib/firebaseWrapper';
import { getStorageUrl, getPuzzlesForConstructorPage } from '../lib/serverOnly';
import { useRouter } from 'next/router';
import { withTranslation } from '../lib/translation';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { FollowersV } from '../lib/dbtypes';
import { paginatedPuzzles } from '../lib/paginatedPuzzles';

interface ErrorProps {
  error: string;
}
type PageProps = ConstructorPageProps | ErrorProps;

const PAGE_SIZE = 10;

const getFollowerCount = async (userId: string) => {
  const db = AdminApp.firestore();
  const followersRes = await db.doc(`followers/${userId}`).get();
  if (!followersRes.exists) {
    console.log('no followers doc');
    return 0;
  }

  const validationResult = FollowersV.decode(followersRes.data());
  if (!isRight(validationResult)) {
    console.error('could not decode followers for', userId);
    console.error(PathReporter.report(validationResult).join(','));
    return 0;
  }
  const followers = validationResult.right.f;
  if (!followers) {
    console.log('no followers');
    return 0;
  }
  return followers.length;
};

export const gssp: GetServerSideProps<PageProps> = async ({
  res,
  params,
}) => {
  if (!params || !Array.isArray(params.slug) || !params.slug[0]) {
    console.error('bad constructor page params');
    res.statusCode = 404;
    return { props: { error: 'Bad username' } };
  }

  const username = params.slug[0].toLowerCase();

  const db = App.firestore();
  let dbres;
  try {
    dbres = await db.collection('cp').doc(username).get();
  } catch {
    return { props: { error: 'Error loading constructor page' } };
  }
  if (!dbres.exists) {
    res.statusCode = 404;
    return { props: { error: 'Page does not exist' } };
  }

  const cp = validate(dbres.data(), username);
  if (!cp) {
    return { props: { error: 'Invalid constructor page' } };
  }

  const profilePicture = await getStorageUrl(`users/${cp.u}/profile.jpg`);
  const coverPicture = await getStorageUrl(`users/${cp.u}/cover.jpg`);

  let page = 0;
  if (params.slug.length === 3 && params.slug[1] === 'page' && params.slug[2]) {
    page = parseInt(params.slug[2]) || 0;
  }
  const [puzzles, hasNext] = await paginatedPuzzles(
    page,
    PAGE_SIZE,
    'a',
    cp.u,
  );

  const followCount = await getFollowerCount(cp.u);

  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  return {
    props: {
      followCount,
      constructor: cp,
      profilePicture,
      coverPicture,
      puzzles,
      currentPage: page,
      prevPage: page > 0 ? page - 1 : null,
      nextPage: hasNext ? page + 1 : null,
    },
  };
};

export const getServerSideProps = withTranslation(gssp);

export default function ConstructorPageHandler(props: PageProps) {
  const router = useRouter();
  useEffect(() => {
    if ('error' in props) {
      return;
    }
    const desiredRoute = props.currentPage
      ? `/${props.constructor.i}/page/${props.currentPage}`
      : `/${props.constructor.i}`;
    if (router.asPath !== desiredRoute) {
      console.log('auto changing route');
      router.replace(desiredRoute, undefined, { shallow: true });
    }
  }, [router, props]);

  if ('error' in props) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>Sorry! Something went wrong while loading that page.</p>
        {props.error ? <p>{props.error}</p> : ''}
      </ErrorPage>
    );
  }

  return <ConstructorPage {...props} />;
}
