import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { I18nTags } from '../../components/I18nTags.js';
import { Link } from '../../components/Link.js';
import {
  LinkablePuzzle,
  PuzzleResultLink,
} from '../../components/PuzzleLink.js';
import { DefaultTopBar } from '../../components/TopBar.js';
import { ConstructorPageBase } from '../../lib/constructorPage.js';
import { paginatedPuzzles } from '../../lib/paginatedPuzzles.js';
import { isUserPatron } from '../../lib/patron.js';
import { userIdToPage } from '../../lib/serverOnly.js';
import { withTranslation } from '../../lib/translation.js';
import styles from './newestPage.module.css';

interface PageProps {
  puzzles: (LinkablePuzzle & {
    constructorPage: ConstructorPageBase | null;
    constructorIsPatron: boolean;
  })[];
  nextPage: number | null;
  currentPage: number;
  prevPage: number | null;
}

export const PAGE_SIZE = 20;

const gssp: GetServerSideProps<PageProps> = async ({ res, params }) => {
  const pn = params?.pageNumber;
  let page: number;
  if (pn === undefined) {
    page = 0;
  } else if (Array.isArray(pn) && pn.length === 1 && pn[0]) {
    page = parseInt(pn[0]);
    if (page.toString() !== pn[0] || page <= 0 || page >= 10) {
      return { notFound: true };
    }
  } else {
    return { notFound: true };
  }

  const [puzzlesWithoutConstructor, hasNext] = await paginatedPuzzles(
    page,
    PAGE_SIZE
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

export default function NewestPageHandler(props: PageProps) {
  const { locale } = useRouter();

  const loc = locale || 'en';

  const page = props.currentPage;
  const title =
    t`Newest Puzzles` +
    (page > 0 ? ' | ' + t`Page ${page}` : '') +
    ' | Crosshare';
  const description = t`All of the latest public puzzles on Crosshare, as they are posted. Enjoy!`;

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
          canonicalPath={`/newest${page !== 0 ? `/${page}` : ''}`}
        />
        {props.prevPage !== null ? (
          <link
            rel="prev"
            href={`https://crosshare.org${loc == 'en' ? '' : '/' + loc}/newest${
              props.prevPage !== 0 ? `/${props.prevPage}` : ''
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
            }/newest/${props.nextPage}`}
          />
        ) : (
          ''
        )}
      </Head>
      <DefaultTopBar />
      <div className={styles.page}>
        <h1 className={styles.head}>
          <Trans>Newest Puzzles</Trans>
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
        {props.nextPage || props.prevPage !== null ? (
          <p className="textAlignCenter">
            {props.prevPage !== null ? (
              <Link
                className="marginRight2em"
                href={`/newest/${
                  props.prevPage !== 0 ? `/${props.prevPage}` : ''
                }`}
              >
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.nextPage !== null ? (
              <Link href={'/newest/' + props.nextPage}>
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
