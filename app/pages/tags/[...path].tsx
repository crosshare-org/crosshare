import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { Root } from 'hast';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ErrorPage } from '../../components/ErrorPage.js';
import { I18nTags } from '../../components/I18nTags.js';
import { Link } from '../../components/Link.js';
import { Markdown } from '../../components/Markdown.js';
import {
  LinkablePuzzle,
  PuzzleResultLink,
} from '../../components/PuzzleLink.js';
import { TagList } from '../../components/TagList.js';
import { DefaultTopBar } from '../../components/TopBar.js';
import { ArticleT } from '../../lib/article.js';
import { ConstructorPageBase } from '../../lib/constructorPage.js';
import { markdownToHast } from '../../lib/markdown/markdown.js';
import { paginatedPuzzles } from '../../lib/paginatedPuzzles.js';
import { isUserPatron } from '../../lib/patron.js';
import { getArticle, userIdToPage } from '../../lib/serverOnly.js';
import { withTranslation } from '../../lib/translation.js';
import { normalizeTag } from '../../lib/utils.js';
import styles from './tagPage.module.css';

interface TagPageProps {
  tags: string[];
  article: (ArticleT & { hast: Root }) | null;
  puzzles: (LinkablePuzzle & {
    constructorPage: ConstructorPageBase | null;
    constructorIsPatron: boolean;
  })[];
  nextPage: number | null;
  currentPage: number;
  prevPage: number | null;
}
interface ErrorProps {
  error: string;
}
type PageProps = TagPageProps | ErrorProps;

export const PAGE_SIZE = 20;

const gssp: GetServerSideProps<PageProps> = async ({ res, params }) => {
  if (!params || !Array.isArray(params.path) || !params.path[0]) {
    console.error('bad tags params');
    res.statusCode = 404;
    return { props: { error: 'Bad tags' } };
  }

  const tags = params.path[0]
    .split(',')
    .map(normalizeTag)
    .filter((t) => t)
    .sort();
  if (!tags.length) {
    res.statusCode = 400;
    return { props: { error: 'Missing tags' } };
  }
  if (tags.length > 3) {
    res.statusCode = 400;
    return { props: { error: 'Maximum of 3 tags per query' } };
  }

  let article: (ArticleT & { hast: Root }) | null = null;
  if (tags.length === 1) {
    const articleRes = await getArticle(`tag:${tags[0]}`);
    if (articleRes !== null && typeof articleRes !== 'string') {
      article = { ...articleRes, hast: markdownToHast({ text: articleRes.c }) };
    }
  }

  let page = 0;
  if (params.path.length === 3 && params.path[1] === 'page' && params.path[2]) {
    page = parseInt(params.path[2]) || 0;
  }
  if (page < 0 || page >= 10) {
    return { props: { error: 'Bad page number' } };
  }
  const [puzzlesWithoutConstructor, hasNext] = await paginatedPuzzles(
    page,
    PAGE_SIZE,
    'tg_i',
    tags.join(' '),
    'array-contains'
  );

  const puzzles = await Promise.all(
    puzzlesWithoutConstructor.map(async (p) => ({
      ...p,
      constructorPage: await userIdToPage(p.authorId),
      constructorIsPatron: await isUserPatron(p.authorId),
    }))
  );
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  return {
    props: {
      tags,
      article,
      puzzles,
      currentPage: page,
      prevPage: page > 0 ? page - 1 : null,
      nextPage: hasNext && page < 9 ? page + 1 : null,
    },
  };
};

export const getServerSideProps = withTranslation(gssp);

export default function TagPageHandler(props: PageProps) {
  const { locale } = useRouter();
  const loc = locale || 'en';

  if ('error' in props) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>Sorry! Something went wrong while loading that page.</p>
        {props.error ? <p>{props.error}</p> : ''}
      </ErrorPage>
    );
  }

  const urlTags = props.tags.join(',');
  const displayTags = props.tags.join(', ');

  const page = props.currentPage;
  const title = props.article?.t
    ? `${props.article.t} | Crosshare`
    : t`Tagged Puzzles` +
      ' | ' +
      displayTags +
      (page > 0 ? ' | ' + t`Page ${page}` : '') +
      ' | Crosshare';
  const description = props.article?.c
    ? props.article.c
    : t`The latest public puzzles tagged with ${displayTags}`;

  return (
    <>
      <Head>
        <title>{title}</title>
        {props.article ? '' : <meta name="robots" content="noindex" />}
        <meta key="og:title" property="og:title" content={title} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
        <meta key="description" name="description" content={description} />
        <I18nTags
          locale={loc}
          canonicalPath={`/tags/${urlTags}${page !== 0 ? `/page/${page}` : ''}`}
        />
        {props.prevPage !== null ? (
          <link
            rel="prev"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/tags/${urlTags}${
              props.prevPage !== 0 ? `/page/${props.prevPage}` : ''
            }`}
          />
        ) : (
          ''
        )}
        {props.nextPage !== null ? (
          <link
            rel="next"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/tags/${urlTags}/page/${props.nextPage}`}
          />
        ) : (
          ''
        )}
      </Head>
      <DefaultTopBar />
      <div className={styles.page}>
        <h1 className={styles.head}>
          <Trans>Puzzles tagged</Trans>
          <TagList className={styles.taglist} tags={props.tags} />
        </h1>
        {props.article ? (
          <Markdown className="marginBottom2em" hast={props.article.hast} />
        ) : (
          ''
        )}
        {props.puzzles.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            constructorPage={p.constructorPage}
            constructorIsPatron={p.constructorIsPatron}
            showAuthor={true}
            filterTags={props.tags}
          />
        ))}
        {props.nextPage || props.prevPage !== null ? (
          <p className="textAlignCenter">
            {props.prevPage !== null ? (
              <Link
                className="marginRight2em"
                href={`/tags/${urlTags}/${
                  props.prevPage !== 0 ? `/page/${props.prevPage}` : ''
                }`}
              >
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.nextPage !== null ? (
              <Link href={`/tags/${urlTags}/page/${props.nextPage}`}>
                <Trans>Older Puzzles</Trans> →
              </Link>
            ) : (
              ''
            )}
          </p>
        ) : (
          ''
        )}
      </div>
    </>
  );
}
