import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import {
  ConstructorPage,
  ConstructorPageProps,
} from '../components/ConstructorPage.js';
import { ErrorPage } from '../components/ErrorPage.js';
import { validate } from '../lib/constructorPage.js';
import { FollowersV } from '../lib/dbtypes.js';
import { getCollection } from '../lib/firebaseAdminWrapper.js';
import { markdownToHast } from '../lib/markdown/markdown.js';
import { paginatedPuzzles } from '../lib/paginatedPuzzles.js';
import { PathReporter } from '../lib/pathReporter.js';
import { isUserMod, isUserPatron } from '../lib/patron.js';
import { AccountPrefsV } from '../lib/prefs.js';
import {
  getStorageUrl,
  userIdToConstructorPageWithPatron,
} from '../lib/serverOnly.js';
import { withTranslation } from '../lib/translation.js';

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
  if (validationResult._tag !== 'Right') {
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
  if (validationResult._tag !== 'Right') {
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
  const isMod = await isUserMod(cp.u);

  const followerIds = await getFollowerIds(cp.u);
  const followers = (
    await Promise.all(followerIds.map(userIdToConstructorPageWithPatron))
  ).flatMap((a) => (a ? [a] : []));

  const followingIds = await getFollowingIds(cp.u);
  const following = (
    await Promise.all(followingIds.map(userIdToConstructorPageWithPatron))
  ).flatMap((a) => (a ? [a] : []));

  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  return {
    props: {
      followCount: followerIds.length,
      followers,
      following,
      constructorData: cp,
      bioHast: markdownToHast({ text: cp.b }),
      isPatron,
      isMod,
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
      ? `/${props.constructorData.i}/page/${props.currentPage}`
      : `/${props.constructorData.i}`;
    if (router.asPath !== desiredRoute) {
      console.log('auto changing route');
      void router.replace(desiredRoute, undefined, { shallow: true });
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
