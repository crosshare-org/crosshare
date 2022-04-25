import { GetServerSideProps } from 'next';
import { useEffect } from 'react';

import {
  ConstructorPage,
  ConstructorPageProps,
} from '../components/ConstructorPage';
import { validate } from '../lib/constructorPage';
import { ErrorPage } from '../components/ErrorPage';
import { getStorageUrl, userIdToPage } from '../lib/serverOnly';
import { useRouter } from 'next/router';
import { withTranslation } from '../lib/translation';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { FollowersV } from '../lib/dbtypes';
import { paginatedPuzzles } from '../lib/paginatedPuzzles';
import { AccountPrefsV } from '../lib/prefs';
import { isUserPatron } from '../lib/patron';
import { getCollection } from '../lib/firebaseAdminWrapper';

interface ErrorProps {
  error: string;
}
type PageProps = ConstructorPageProps | ErrorProps;

const PAGE_SIZE = 10;

const getFollowerIds = async (userId: string) => {
  const followersRes = await getCollection('followers').doc(userId).get();
  if (!followersRes.exists) {
    console.log('no followers doc');
    return [];
  }

  const validationResult = FollowersV.decode(followersRes.data());
  if (!isRight(validationResult)) {
    console.error('could not decode followers for', userId);
    console.error(PathReporter.report(validationResult).join(','));
    return [];
  }
  const followers = validationResult.right.f;
  if (!followers) {
    console.log('no followers');
    return [];
  }
  return followers;
};

const getFollowingIds = async (userId: string) => {
  const prefsRes = await getCollection('prefs').doc(userId).get();
  if (!prefsRes.exists) {
    console.log('no prefs doc');
    return [];
  }

  const validationResult = AccountPrefsV.decode(prefsRes.data());
  if (!isRight(validationResult)) {
    console.error('could not decode prefs for', userId);
    console.error(PathReporter.report(validationResult).join(','));
    return [];
  }
  const following = validationResult.right.following;
  if (!following) {
    console.log('not following');
    return [];
  }
  return following;
};

async function followIdToInfo(id: string) {
  const page = await userIdToPage(id);
  if (!page) {
    return null;
  }
  const isPatron = await isUserPatron(id);
  return { ...page, isPatron };
}

const gssp: GetServerSideProps<PageProps> = async ({ res, params }) => {
  if (!params || !Array.isArray(params.slug) || !params.slug[0]) {
    console.error('bad constructor page params');
    res.statusCode = 404;
    return { props: { error: 'Bad username' } };
  }

  const username = params.slug[0].toLowerCase();

  let dbres;
  try {
    dbres = await getCollection('cp').doc(username).get();
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
  const [puzzles, hasNext] = await paginatedPuzzles(page, PAGE_SIZE, 'a', cp.u);

  const isPatron = await isUserPatron(cp.u);

  const followerIds = await getFollowerIds(cp.u);
  const followers = (
    await Promise.all(followerIds.map(followIdToInfo))
  ).flatMap((a) => (a ? [a] : []));

  const followingIds = await getFollowingIds(cp.u);
  const following = (
    await Promise.all(followingIds.map(followIdToInfo))
  ).flatMap((a) => (a ? [a] : []));

  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  return {
    props: {
      followCount: followerIds.length,
      followers,
      following,
      constructor: cp,
      isPatron,
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
