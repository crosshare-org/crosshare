import { Trans, t } from '@lingui/macro';
import { isSome } from 'fp-ts/lib/Option';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useContext } from 'react';
import { AuthContext } from '../components/AuthContext';
import { ContactLinks } from '../components/ContactLinks';
import { CreateShareSection } from '../components/CreateShareSection';
import { I18nTags } from '../components/I18nTags';
import { PatronIcon } from '../components/Icons';
import { Link } from '../components/Link';
import {
  LinkablePuzzle,
  PuzzleResultLink,
  toLinkablePuzzle,
} from '../components/PuzzleLink';
import { DefaultTopBar } from '../components/TopBar';
import { UnfinishedPuzzleList } from '../components/UnfinishedPuzzleList';
import { ArticleT, validate } from '../lib/article';
import { ConstructorPageBase } from '../lib/constructorPage';
import { getMiniForDate } from '../lib/dailyMinis';
import { getCollection } from '../lib/firebaseAdminWrapper';
import { paginatedPuzzles } from '../lib/paginatedPuzzles';
import { isUserPatron } from '../lib/patron';
import { userIdToPage } from '../lib/serverOnly';
import { SMALL_AND_UP } from '../lib/style';
import { withTranslation } from '../lib/translation';
import { puzzleFromDB } from '../lib/types';
import { PAGE_SIZE } from './featured/[pageNumber]';

type HomepagePuz = LinkablePuzzle & {
  constructorPage: ConstructorPageBase | null;
  constructorIsPatron: boolean;
};

interface HomePageProps {
  dailymini: HomepagePuz | null;
  featured: HomepagePuz[];
  articles: ArticleT[];
  showCampaignForYear: number | null;
}

const gssp: GetServerSideProps<HomePageProps> = async ({ res }) => {
  const today = new Date();
  const todaysMini = await getMiniForDate(today);

  const unfilteredArticles = await getCollection('a')
    .where('f', '==', true)
    .get()
    .then((articlesResult) => {
      return articlesResult.docs.map((d) => validate(d.data()));
    });

  const articles: ArticleT[] = unfilteredArticles.filter((i): i is ArticleT => {
    return i !== null;
  });

  const showCampaignForYear =
    today.getUTCMonth() === 11 ? today.getUTCFullYear() + 1 : null;

  const [puzzlesWithoutConstructor] = await paginatedPuzzles(
    0,
    PAGE_SIZE,
    'f',
    true
  );
  const featured = await Promise.all(
    puzzlesWithoutConstructor.map(async (p) => ({
      ...p,
      constructorPage: await userIdToPage(p.authorId),
      constructorIsPatron: await isUserPatron(p.authorId),
    }))
  );

  if (isSome(todaysMini)) {
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    const dm: HomepagePuz = {
      ...toLinkablePuzzle({
        ...puzzleFromDB(todaysMini.value),
        id: todaysMini.value.id,
      }),
      constructorPage: await userIdToPage(todaysMini.value.a),
      constructorIsPatron: await isUserPatron(todaysMini.value.a),
    };
    return {
      props: { dailymini: dm, featured, articles, showCampaignForYear },
    };
  }
  return {
    props: { dailymini: null, featured, articles, showCampaignForYear },
  };
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
  showCampaignForYear,
}: HomePageProps) {
  const today = new Date();
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const title = t`Crosshare - Free Crossword Constructor and Daily Mini Crossword Puzzles`;
  return (
    <>
      <Head>
        <title>{title}</title>
        {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
        <I18nTags locale={router.locale || 'en'} canonicalPath="/" />
      </Head>

      <DefaultTopBar />

      <div className="margin1em">
        {showCampaignForYear ? (
          showCampaignForYear <= 2024 ? (
            <Link
              css={{
                display: 'block',
                textDecoration: 'none',
                color: 'var(--text)',
                border: '1px solid var(--error)',
                borderRadius: '0.5em',
                padding: '1em',
                marginBottom: '1em',
                '&:hover': {
                  color: 'var(--text)',
                  textDecoration: 'none',
                },
              }}
              href="/donate"
            >
              <div>
                <h3>
                  <span className="colorError">Thank you!</span>
                </h3>
                Thanks to the generous support of all of our patrons,
                Crosshare&apos;s {showCampaignForYear - 1} fundraising campaign
                was a success. Here&apos;s to a crossword-filled{' '}
                {showCampaignForYear}!
              </div>
            </Link>
          ) : (
            <Link
              css={{
                display: 'block',
                textDecoration: 'none',
                color: 'var(--text)',
                border: '1px solid var(--error)',
                borderRadius: '0.5em',
                padding: '1em',
                marginBottom: '1em',
                '&:hover': {
                  color: 'var(--text)',
                  textDecoration: 'none',
                },
              }}
              href="/donate"
            >
              <h3>
                <span className="colorError">Read this</span> - we need your
                help!
              </h3>
              <div>
                As Crosshare continues to grow (and add new features) I need
                help to pay for the ongoing costs of running the site. This
                holiday season / new year, I&apos;m hoping to reach $100/month
                in new recurring donations to keep the site going through{' '}
                {showCampaignForYear} and beyond. Please consider contributing
                whatever you are able. All monthly contributors get a patron
                icon - <PatronIcon /> - so we all know who to thank for making
                the site possible!
              </div>
            </Link>
          )
        ) : (
          ''
        )}
        <p className="marginBottom1em">
          <Trans>
            Crosshare is a <b>free</b>, <b>ad-free</b>, and{' '}
            <a href="https://github.com/crosshare-org/crosshare">open-source</a>{' '}
            place to create, share and solve crossword puzzles.
          </Trans>
        </p>
        <p>
          <Trans>
            If you&apos;re enjoying Crosshare please consider{' '}
            <Link href="/donate">donating</Link> to support its continuing
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
          {dailymini ? (
            <div className="flex50">
              <h2>
                <Trans>Daily Mini</Trans>
              </h2>
              <PuzzleResultLink
                fullWidth
                puzzle={dailymini}
                showAuthor={true}
                constructorPage={dailymini.constructorPage}
                constructorIsPatron={dailymini.constructorIsPatron}
                title={t`Today's daily mini crossword`}
                filterTags={[]}
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
          ) : (
            ''
          )}
          <div className="flex50">
            <CreateShareSection halfWidth={true} />
          </div>
        </div>
        <hr className="margin2em0" />
        <h2 className="marginBottom0">
          <Trans>Featured Puzzles</Trans>
        </h2>
        <div className="marginBottom1-5em">
          <Link href="/newest">
            <Trans>View all puzzles</Trans> &rarr;
          </Link>
        </div>
        {featured.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            constructorPage={p.constructorPage}
            showAuthor={true}
            constructorIsPatron={p.constructorIsPatron}
            filterTags={[]}
          />
        ))}
        <p>
          <Link href="/featured/1">
            <Trans>Previous featured puzzles</Trans> &rarr;
          </Link>
        </p>
        <hr className="margin2em0" />
        <UnfinishedPuzzleList user={user} />
        <h4 className="marginTop2em">
          <Trans>Frequently asked questions and information</Trans>
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
          <Trans comment="the variable is a translated version of 'email or twitter'">
            If you have questions or suggestions please contact us via{' '}
            <ContactLinks />.
          </Trans>
        </p>
      </div>
    </>
  );
}
