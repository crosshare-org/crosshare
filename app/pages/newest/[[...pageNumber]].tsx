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
import { ConstructorPageT } from '../../lib/constructorPage';
import { paginatedPuzzles } from '../../lib/paginatedPuzzles';

interface NewestPageProps {
  puzzles: Array<LinkablePuzzle & { constructorPage: ConstructorPageT | null }>;
  nextPage: number | null;
  currentPage: number;
  prevPage: number | null;
}
interface ErrorProps {
  error: string;
}
type PageProps = NewestPageProps | ErrorProps;

export const PAGE_SIZE = 20;

const gssp: GetServerSideProps<PageProps> = async ({
  res,
  params,
}) => {
  const pn = params?.pageNumber;
  let page: number;
  if (!pn) {
    page = 0;
  } else if (Array.isArray(pn) && pn.length === 1 && pn[0]) {
    page = parseInt(pn[0]);
    if (page.toString() !== pn[0] || page <= 0) {
      return { props: { error: 'Bad page number' } };
    }
  } else {
    return { props: { error: 'Bad page number' } };
  }

  const [puzzlesWithoutConstructor, hasNext] = await paginatedPuzzles(
    page,
    PAGE_SIZE
  );
  const puzzles = await Promise.all(
    puzzlesWithoutConstructor.map(async (p) => ({
      ...p,
      constructorPage: await userIdToPage(p.authorId),
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

export default function NewestPageHandler(props: PageProps) {
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

  const page = props.currentPage;
  const title = t`Newest Puzzles` + (page > 0 ? ' | ' + t`Page ${page}` : '') + ' | Crosshare';
  const description =
    t({ id: 'newest-desc', message: 'All of the latest public puzzles on Crosshare, as they are posted. Enjoy!' });

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
        <I18nTags locale={loc} canonicalPath={`/newest${page !== 0 ? `/${page}` : ''}`} />
        {props.prevPage !== null ? (
          <link
            rel="prev"
            href={`https://crosshare.org${loc == 'en' ? '' : '/' + loc}/newest${props.prevPage !== 0 ? `/${props.prevPage}` : ''}`}
          />
        ) : (
          ''
        )}
        {props.nextPage !== null ? (
          <link
            rel="next"
            href={`https://crosshare.org${loc == 'en' ? '' : '/' + loc}/newest/${props.nextPage}`}
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
          <Trans>
            Newest Puzzles
          </Trans>
        </h1>
        <p>{description}</p>
        {props.puzzles.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            constructorPage={p.constructorPage}
            showAuthor={true}
          />
        ))}
        {props.nextPage || props.prevPage !== null ? (
          <p css={{ textAlign: 'center' }}>
            {props.prevPage !== null ? (
              <Link
                css={{ marginRight: '2em' }}
                href={`/newest/${props.prevPage !== 0 ? `/${props.prevPage}` : ''}`}
              >
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.nextPage !== null ? (
              <Link href={'/newest/' + props.nextPage}><Trans>Older Puzzles</Trans> →</Link>
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
