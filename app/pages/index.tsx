import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { Root } from 'hast';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useContext } from 'react';
import { AuthContext } from '../components/AuthContext.js';
import { ContactLinks } from '../components/ContactLinks.js';
import { CreateShareSection } from '../components/CreateShareSection.js';
import { I18nTags } from '../components/I18nTags.js';
import { Link } from '../components/Link.js';
import { Markdown } from '../components/Markdown.js';
import {
  LinkablePuzzle,
  PuzzleResultLink,
  toLinkablePuzzle,
} from '../components/PuzzleLink.js';
import { DefaultTopBar } from '../components/TopBar.js';
import { UnfinishedPuzzleList } from '../components/UnfinishedPuzzleList.js';
import { ArticleT, validate } from '../lib/article.js';
import { ConstructorPageBase } from '../lib/constructorPage.js';
import { AdminSettingsV, DBPuzzleT } from '../lib/dbtypes.js';
import { getCollection } from '../lib/firebaseAdminWrapper.js';
import { markdownToHast } from '../lib/markdown/markdown.js';
import { paginatedPuzzles } from '../lib/paginatedPuzzles.js';
import { isUserPatron } from '../lib/patron.js';
import {
  getMiniForDate,
  getPreviousArticle,
  maxWeeklyEmailArticle,
  userIdToPage,
} from '../lib/serverOnly.js';
import { withTranslation } from '../lib/translation.js';
import { puzzleFromDB } from '../lib/types.js';
import { PAGE_SIZE } from './featured/[pageNumber].js';
import styles from './index.module.scss';

type HomepagePuz = LinkablePuzzle & {
  constructorPage: ConstructorPageBase | null;
  constructorIsPatron: boolean;
};

interface HomePageProps {
  dailymini: HomepagePuz | null;
  throwbackMini: HomepagePuz | null;
  lastEmailSlug: string | null;
  featured: HomepagePuz[];
  articles: ArticleT[];
  announcement: { title: string; body: Root } | null;
  homepageText: Root | null;
}

const gssp: GetServerSideProps<HomePageProps> = async ({ res }) => {
  const today = new Date();
  const todaysMini = await getMiniForDate(today);
  today.setUTCFullYear(today.getUTCFullYear() - 5);
  const throwback = await getMiniForDate(today);
  const lastEmailRes = await getPreviousArticle(maxWeeklyEmailArticle());
  const lastEmailSlug =
    lastEmailRes !== null && typeof lastEmailRes !== 'string'
      ? lastEmailRes.s
      : null;

  const [announcement, homepageText]: [
    { title: string; body: Root } | null,
    Root | null,
  ] = await getCollection('settings')
    .doc('settings')
    .get()
    .then((res) => {
      if (!res.exists) {
        return [null, null];
      }
      const a = AdminSettingsV.decode(res.data());
      if (a._tag === 'Right') {
        return [
          a.right.announcement
            ? {
                ...a.right.announcement,
                body: markdownToHast({ text: a.right.announcement.body }),
              }
            : null,
          a.right.homepageText
            ? markdownToHast({ text: a.right.homepageText })
            : null,
        ];
      } else {
        console.error('malformed settings doc');
        return [null, null];
      }
    });

  const unfilteredArticles = await getCollection('a')
    .where('f', '==', true)
    .get()
    .then((articlesResult) => {
      return articlesResult.docs.map((d) => validate(d.data()));
    });
  const articles: ArticleT[] = unfilteredArticles.filter((i): i is ArticleT => {
    return i !== null;
  });

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

  async function convertMini(
    mini: DBPuzzleT & { id: string }
  ): Promise<HomepagePuz> {
    return {
      ...toLinkablePuzzle({
        ...puzzleFromDB(mini, mini.id),
        id: mini.id,
      }),
      constructorPage: await userIdToPage(mini.a),
      constructorIsPatron: await isUserPatron(mini.a),
    };
  }

  let dailymini: HomepagePuz | null = null;
  let throwbackMini: HomepagePuz | null = null;
  if (todaysMini !== null) {
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    dailymini = await convertMini(todaysMini);
  }
  if (throwback !== null) {
    throwbackMini = await convertMini(throwback);
  }
  return {
    props: {
      announcement,
      homepageText,
      dailymini,
      throwbackMini,
      lastEmailSlug,
      featured,
      articles,
    },
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
  announcement,
  homepageText,
  dailymini,
  throwbackMini,
  lastEmailSlug,
  featured,
  articles,
}: HomePageProps) {
  const today = new Date();
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const title = t`Crosshare - Free Crossword Constructor and Daily Mini Crossword Puzzles`;
  return (
    <>
      <Head>
        <title>{title}</title>
        <I18nTags locale={router.locale || 'en'} canonicalPath="/" />
      </Head>

      <DefaultTopBar />

      <div className="margin1em">
        {announcement ? (
          <div className={styles.campaign}>
            <h3>
              <span className="colorError">{announcement.title}</span>
            </h3>
            <div>
              <Markdown hast={announcement.body} />
            </div>
          </div>
        ) : (
          ''
        )}
        {homepageText && router.locale === 'en' ? (
          <Markdown hast={homepageText} className="marginBottom1em" />
        ) : (
          <>
            <p className="marginBottom1em">
              <Trans>
                Crosshare is a <b>free</b>, <b>ad-free</b>, and{' '}
                <a href="https://github.com/crosshare-org/crosshare">
                  open-source
                </a>{' '}
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
          </>
        )}
        <div className={styles.top}>
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
              {throwbackMini ? (
                <>
                  <h3>
                    Throwback Daily Mini (from {today.getFullYear() - 5}):
                  </h3>
                  <PuzzleResultLink
                    fullWidth
                    puzzle={throwbackMini}
                    showAuthor={true}
                    constructorPage={throwbackMini.constructorPage}
                    constructorIsPatron={throwbackMini.constructorIsPatron}
                    filterTags={[]}
                    compact={true}
                  />
                </>
              ) : (
                ''
              )}
              <div>
                <Link
                  href={`/dailyminis/${today.getUTCFullYear()}/${
                    today.getUTCMonth() + 1
                  }`}
                >
                  <Trans>Previous daily minis</Trans> &rarr;
                </Link>
              </div>
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
        {user && !user.isAnonymous ? (
          <>
            <hr className="margin2em0" />
            <UnfinishedPuzzleList user={user} />
          </>
        ) : (
          ''
        )}
        <hr className="margin2em0" />
        <h4>Weekly Email</h4>
        <p>
          We send a once-weekly email with a recap of the most popular puzzles
          of the week. To subscribe, visit{' '}
          <Link href="/account">your account page</Link>.{' '}
          {lastEmailSlug !== null ? (
            <>
              You can read our most recent weekly email{' '}
              <Link href={`/articles/${lastEmailSlug}`}>here</Link>.
            </>
          ) : (
            ''
          )}
        </p>
        <h4 className="marginTop2em">
          <Trans>Frequently asked questions and information</Trans>
        </h4>
        <ul className={styles.articles}>{articles.map(ArticleListItem)}</ul>
        <p className={styles.contact}>
          <Trans comment="the variable is a translated version of 'email or twitter'">
            If you have questions or suggestions please contact us via{' '}
            <ContactLinks />.
          </Trans>
        </p>
      </div>
    </>
  );
}
