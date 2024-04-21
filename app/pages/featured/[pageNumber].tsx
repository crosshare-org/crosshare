import { GetServerSideProps } from 'next';

import { ErrorPage } from '../../components/ErrorPage';
import { userIdToPage } from '../../lib/serverOnly';
import Head from 'next/head';
import { DefaultTopBar } from '../../components/TopBar';
import { HUGE_AND_UP, MAX_WIDTH } from '../../lib/style';
import { LinkablePuzzle, PuzzleResultLink } from '../../components/PuzzleLink';
import { Link } from '../../components/Link';
import { withTranslation } from '../../lib/translation';
import { Trans, t } from '@lingui/macro';
import { useRouter } from 'next/router';
import { I18nTags } from '../../components/I18nTags';
import { paginatedPuzzles } from '../../lib/paginatedPuzzles';
import { ConstructorPageBase } from '../../lib/constructorPage';
import { isUserPatron } from '../../lib/patron';

interface FeaturedPageProps {
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
type PageProps = FeaturedPageProps | ErrorProps;

export const PAGE_SIZE = 20;

const gssp: GetServerSideProps<PageProps> = async ({ res, params }) => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!params?.pageNumber || Array.isArray(params.pageNumber)) {
    return { props: { error: 'Bad params' } };
  }

  const page = parseInt(params.pageNumber);
  if (page < 1 || page.toString() !== params.pageNumber || page >= 10) {
    return { props: { error: 'Bad page number' } };
  }
  const [puzzlesWithoutConstructor, hasNext] = await paginatedPuzzles(
    page,
    PAGE_SIZE,
    'f',
    true
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
      puzzles,
      currentPage: page,
      prevPage: page > 0 ? page - 1 : null,
      nextPage: hasNext && page < 9 ? page + 1 : null,
    },
  };
};

export const getServerSideProps = withTranslation(gssp);

export default function FeaturedPageHandler(props: PageProps) {
  const { locale } = useRouter();
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const loc = locale || 'en';

  if ('error' in props) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>Sorry! Something went wrong while loading that page.</p>
        {props.error ? <p>{props.error}</p> : ''}
      </ErrorPage>
    );
  }

  const currentPageNumber = props.currentPage;
  const title = t`Featured Puzzles | Page ${currentPageNumber} | Crosshare`;
  const description = t`Featured puzzles are puzzles selected by Crosshare that we found to be particularly fun and well constructed. Enjoy!`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta key="og:title" property="og:title" content={title} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
        <meta key="description" name="description" content={description} />
        <I18nTags
          locale={loc}
          canonicalPath={`/featured/${props.currentPage}`}
        />
        {props.prevPage === 0 ? (
          <link
            rel="prev"
            href={`https://crosshare.org${loc == 'en' ? '' : '/' + loc}/`}
          />
        ) : (
          ''
        )}
        {props.prevPage ? (
          <link
            rel="prev"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/featured/${props.prevPage}`}
          />
        ) : (
          ''
        )}
        {props.nextPage !== null ? (
          <link
            rel="next"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/featured/${props.nextPage}`}
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
        <h1 css={{ fontSize: '1.4em', marginBottom: 0 }}>
          <Trans>Crosshare Featured Puzzles</Trans>
        </h1>
        <p>{description}</p>
        {props.puzzles.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            constructorPage={p.constructorPage}
            constructorIsPatron={p.constructorIsPatron}
            showAuthor={true}
            filterTags={[]}
          />
        ))}
        {props.nextPage !== null || props.prevPage !== null ? (
          <p className="textAlignCenter">
            {props.prevPage === 0 ? (
              <Link className="marginRight2em" href="/">
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.prevPage ? (
              <Link
                className="marginRight2em"
                href={'/featured/' + props.prevPage}
              >
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.nextPage !== null ? (
              <Link href={'/featured/' + props.nextPage}>
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
