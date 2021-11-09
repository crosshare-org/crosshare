import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { getDailyMinis } from '../lib/dailyMinis';
import { Link } from '../components/Link';
import { puzzleFromDB, ServerPuzzleResult } from '../lib/types';
import { DBPuzzleV, getDateString } from '../lib/dbtypes';
import { AdminApp } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import { PuzzleResultLink } from '../components/PuzzleLink';
import { getPuzzlesForFeatured, userIdToPage } from '../lib/serverOnly';
import { PAGE_SIZE } from './featured/[pageNumber]';
import { useContext } from 'react';
import { AuthContext } from '../components/AuthContext';
import { ContactLinks } from '../components/ContactLinks';
import { CreateShareSection } from '../components/CreateShareSection';
import { SMALL_AND_UP } from '../lib/style';
import { UnfinishedPuzzleList } from '../components/UnfinishedPuzzleList';
import { ArticleT, validate } from '../lib/article';
import { Trans, t } from '@lingui/macro';
import { withTranslation } from '../lib/translation';

interface HomePageProps {
  dailymini: ServerPuzzleResult;
  featured: Array<ServerPuzzleResult>;
  articles: Array<ArticleT>;
}

const gssp: GetServerSideProps<HomePageProps> = async ({ res }) => {
  const db = AdminApp.firestore();
  const minis = await getDailyMinis();
  const today = getDateString(new Date());
  const todaysMini = Object.entries(minis)
    .filter(([date]) => date <= today)
    .sort(([a], [b]) => b.localeCompare(a))?.[0]?.[1];
  if (!todaysMini) {
    throw new Error('no minis scheduled!');
  }

  const unfilteredArticles = await db
    .collection('a')
    .where('f', '==', true)
    .get()
    .then((articlesResult) => {
      return articlesResult.docs.map((d) => validate(d.data()));
    });

  const articles: ArticleT[] = unfilteredArticles.filter((i): i is ArticleT => {
    return i !== null;
  });

  const [puzzlesWithoutConstructor] = await getPuzzlesForFeatured(0, PAGE_SIZE);
  const featured = await Promise.all(
    puzzlesWithoutConstructor.map(async (p) => ({
      ...p,
      constructorPage: await userIdToPage(p.authorId),
    }))
  );

  return db
    .collection('c')
    .doc(todaysMini)
    .get()
    .then(async (dmResult) => {
      const data = dmResult.data();
      const validationResult = DBPuzzleV.decode(data);
      if (isRight(validationResult)) {
        res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
        const dm = {
          ...puzzleFromDB(validationResult.right),
          id: dmResult.id,
          constructorPage: await userIdToPage(validationResult.right.a),
        };
        return { props: { dailymini: dm, featured, articles } };
      } else {
        console.error(PathReporter.report(validationResult).join(','));
        throw new Error('Malformed daily mini');
      }
    });
};

export const getServerSideProps = withTranslation(gssp);

const ArticleListItem = (props: ArticleT) => {
  return (
    <li key={props.s}>
      <Link href={`/articles/${props.s}`}>{props.t}</Link>
    </li>
  );
};

export default function HomePage({
  dailymini,
  featured,
  articles,
}: HomePageProps) {
  const today = new Date();
  const { user } = useContext(AuthContext);

  return (
    <>
      <Head>
        <title>
          Crosshare - Free Crossword Constructor and Daily Mini Crossword
          Puzzles
        </title>
      </Head>

      <DefaultTopBar />

      <div css={{ margin: '1em' }}>
        <p css={{ marginBottom: '1em' }}>
          <Trans>
            Crosshare is a <b>free</b>, <b>ad-free</b>, and{' '}
            <a href="https://github.com/mdirolf/crosshare/">open-source</a>{' '}
            place to create, share and solve crossword puzzles.
          </Trans>
        </p>
        <p>
          <Trans>
            If you&apos;re enjoying Crosshare please consider{' '}
            <a href="/donate">donating</a> to support its continuing
            development.
          </Trans>
        </p>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            [SMALL_AND_UP]: {
              flexDirection: 'row',
            },
          }}
        >
          <div css={{ flex: '50%' }}>
            <h2>
              <Trans>Daily Mini</Trans>
            </h2>
            <PuzzleResultLink
              fullWidth
              puzzle={dailymini}
              showAuthor={true}
              constructorPage={dailymini.constructorPage}
              title={t`Today's daily mini crossword`}
            />
            <p>
              <Link
                href={`/dailyminis/${today.getUTCFullYear()}/${
                  today.getUTCMonth() + 1
                }`}
              >
                <Trans>Previous daily minis</Trans> &rarr;
              </Link>
            </p>
          </div>
          <div css={{ flex: '50%' }}>
            <CreateShareSection halfWidth={true} />
          </div>
        </div>
        <hr css={{ margin: '2em 0' }} />
        <h2>Featured Puzzles</h2>
        {featured.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            constructorPage={p.constructorPage}
            showAuthor={true}
          />
        ))}
        <p>
          <Link href="/featured/1">Previous featured puzzles &rarr;</Link>
        </p>
        <hr css={{ margin: '2em 0' }} />
        <UnfinishedPuzzleList user={user} />
        <h4 css={{ marginTop: '2em' }}>
          Frequently asked questions and information
        </h4>
        <ul
          css={{
            listStyleType: 'none',
            padding: 0,
            margin: 0,
            columnWidth: '30em',
          }}
        >
          {articles.map(ArticleListItem)}
        </ul>
        <p css={{ marginTop: '1em', textAlign: 'center' }}>
          If you have questions or suggestions please contact us via{' '}
          <ContactLinks />.
        </p>
      </div>
    </>
  );
}
