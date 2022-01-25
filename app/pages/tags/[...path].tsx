import { GetServerSideProps } from 'next';

import { ErrorPage } from '../../components/ErrorPage';
import { getArticle, userIdToPage } from '../../lib/serverOnly';
import Head from 'next/head';
import { DefaultTopBar } from '../../components/TopBar';
import { HUGE_AND_UP, MAX_WIDTH } from '../../lib/style';
import { LinkablePuzzle, PuzzleResultLink } from '../../components/PuzzleLink';
import { Link } from '../../components/Link';
import { withTranslation } from '../../lib/translation';
import { Trans, t } from '@lingui/macro';
import { useRouter } from 'next/router';
import { I18nTags } from '../../components/I18nTags';
import { ConstructorPageT } from '../../lib/constructorPage';
import { paginatedPuzzles } from '../../lib/paginatedPuzzles';
import { isUserPatron } from '../../lib/patron';
import { normalizeTag } from '../../lib/utils';
import { TagList } from '../../components/TagList';
import { ArticleT } from '../../lib/article';
import { Markdown } from '../../components/Markdown';

interface TagPageProps {
  tags: string[];
  article: ArticleT | null;
  puzzles: Array<
    LinkablePuzzle & {
      constructorPage: ConstructorPageT | null;
      constructorIsPatron: boolean;
    }
  >;
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

  let article: ArticleT | null = null;
  if (tags.length === 1) {
    const articleRes = await getArticle(`tag:${tags[0]}`);
    if (typeof articleRes !== 'string') {
      article = articleRes;
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
  const title =
    t`Tagged Puzzles` +
    ' | ' +
    displayTags +
    (page > 0 ? ' | ' + t`Page ${page}` : '') +
    ' | Crosshare';
  const description = t({
    id: 'tagged-desc',
    message: `The latest public puzzles tagged with ${displayTags}`,
  });

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
      <div
        css={{
          margin: '1em',
          [HUGE_AND_UP]: {
            maxWidth: MAX_WIDTH,
            margin: '1em auto',
          },
        }}
      >
        <h1 css={{ fontSize: '1.4em', marginBottom: '1em' }}>
          <Trans>Puzzles tagged</Trans>
          <TagList
            css={{
              fontWeight: 'normal',
              display: 'inline-flex',
              margin: '0 0 0 0.5em',
            }}
            tags={props.tags}
          />
        </h1>
        {props.article ? (
          <Markdown css={{ marginBottom: '2em' }} text={props.article.c} />
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
          <p css={{ textAlign: 'center' }}>
            {props.prevPage !== null ? (
              <Link
                css={{ marginRight: '2em' }}
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
