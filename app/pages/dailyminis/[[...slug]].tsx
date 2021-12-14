import Head from 'next/head';
import { GetServerSideProps } from 'next';

import { Link } from '../../components/Link';
import { ErrorPage } from '../../components/ErrorPage';
import { App } from '../../lib/firebaseWrapper';
import { puzzleFromDB } from '../../lib/types';
import { ConstructorPageT } from '../../lib/constructorPage';
import { Markdown } from '../../components/Markdown';
import { DefaultTopBar } from '../../components/TopBar';
import {
  LinkablePuzzle,
  PuzzleResultLink,
  toLinkablePuzzle,
} from '../../components/PuzzleLink';
import { userIdToPage } from '../../lib/serverOnly';
import { useRouter } from 'next/router';
import { Trans, t } from '@lingui/macro';
import { withTranslation } from '../../lib/translation';
import { I18nTags } from '../../components/I18nTags';
import { isUserPatron } from '../../lib/patron';
import { AnyFirestore } from '../../lib/dbUtils';
import { getMiniForDate } from '../../lib/dailyMinis';
import { isSome } from 'fp-ts/lib/Option';
import { notEmpty } from '../../lib/utils';

export interface DailyMiniProps {
  puzzles: Array<[number, LinkablePuzzle, ConstructorPageT | null, boolean]>;
  year: number;
  month: number;
  olderLink?: string;
  newerLink?: string;
}
interface ErrorProps {
  error: string;
}
type PageProps = DailyMiniProps | ErrorProps;

const gssp: GetServerSideProps<PageProps> = async ({ res, params }) => {
  const slug = params?.slug;
  let year: number;
  let month: number;
  if (!slug) {
    const today = new Date();
    year = today.getUTCFullYear();
    month = today.getUTCMonth();
  } else if (Array.isArray(slug) && slug.length === 2 && slug[0] && slug[1]) {
    year = parseInt(slug[0]);
    month = parseInt(slug[1]) - 1;
  } else {
    console.error('bad daily mini params');
    res.statusCode = 404;
    return { props: { error: 'Bad params' } };
  }
  const props = await propsForDailyMini(year, month);
  if (!('error' in props)) {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200');
  }
  return { props: props };
};

export const getServerSideProps = withTranslation(gssp);

async function puzzlesListForMonth(
  db: AnyFirestore,
  year: number,
  month: number,
  maxDay: number
): Promise<Array<[number, LinkablePuzzle, ConstructorPageT | null, boolean]>> {
  return Promise.all(
    [...Array(maxDay).keys()]
      .reverse()
      .map(
        async (
          day
        ): Promise<
          [number, LinkablePuzzle, ConstructorPageT | null, boolean] | null
        > => {
          const dbpuzzle = await getMiniForDate(
            db,
            new Date(year, month, day + 1)
          );
          if (!isSome(dbpuzzle)) {
            return null;
          }
          const puzzle = puzzleFromDB(dbpuzzle.value);
          const cp = await userIdToPage(dbpuzzle.value.a);
          const isPatron = await isUserPatron(dbpuzzle.value.a);
          return [
            day + 1,
            toLinkablePuzzle({ ...puzzle, id: dbpuzzle.value.id }),
            cp,
            isPatron,
          ];
        }
      )
  ).then((a) => a.filter(notEmpty));
}

// We export this so we can use it for testing
export async function propsForDailyMini(
  year: number,
  month: number
): Promise<PageProps> {
  const today = new Date();
  const db = App.firestore();

  let lastDay = new Date(year, month + 1, 0).getUTCDate();
  if (year === today.getUTCFullYear() && month === today.getUTCMonth()) {
    lastDay = today.getUTCDate();
  }
  const puzzles = await puzzlesListForMonth(db, year, month, lastDay);
  if (!puzzles.length) {
    return { error: 'No minis for that month' };
  }
  return {
    year: year,
    month: month,
    puzzles: puzzles,
    ...(today.getUTCFullYear() !== year || today.getUTCMonth() !== month
      ? {
          newerLink:
            month + 1 === 12 ? `${year + 1}/1` : `${year}/${month + 2}`,
        }
      : null),
    ...(month === 0 && year > 2020
      ? { olderLink: `${year - 1}/12` }
      : year > 2020 || month >= 4
      ? { olderLink: `${year}/${month}` }
      : null),
  };
}

export default function DailyMiniPage(props: PageProps) {
  const { locale } = useRouter();
  const loc = locale || 'en';

  if ('error' in props) {
    return (
      <ErrorPage title="Category Not Found">
        <p>
          We&apos;re sorry, we couldn&apos;t find the category page you
          requested: {props.error}
        </p>
        <p>
          Try the <Link href="/">homepage</Link>.
        </p>
      </ErrorPage>
    );
  }
  const description = t({
    id: 'mini-explain',
    message: `Crosshare features a free daily mini crossword every day of the week.
  These puzzles are a great way to give your brain a bite-sized challenge, and to
  learn how crosswords work before taking on larger puzzles.

  Mini puzzles are most often 5x5, but can be other sizes as well - sometimes
  the weekend minis are a bit larger. Any small sized puzzle you publish publicly to Crosshare
  will be eligible for selection as a daily mini!`,
  });

  const date = new Date(props.year, props.month, 1).toLocaleString(loc, {
    month: 'long',
    year: 'numeric',
  });
  const title = t({
    id: 'mini-title',
    message: `Daily Mini Puzzles for ${date}`,
    comment: 'The variable is a month and year like noviembre de 2021',
  });
  return (
    <>
      <Head>
        <title>{title} | Crosshare crosswords</title>
        <meta key="og:title" property="og:title" content={title} />
        <meta key="description" name="description" content={description} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
        <I18nTags
          locale={loc}
          canonicalPath={`/dailyminis/${props.year}/${props.month + 1}`}
        />
        {props.olderLink ? (
          <link
            rel="next"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/dailyminis/${props.olderLink}`}
          />
        ) : (
          ''
        )}
        {props.newerLink ? (
          <link
            rel="next"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/dailyminis/${props.newerLink}`}
          />
        ) : (
          ''
        )}
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em' }}>
        <h2>
          <Trans comment="the variable is a month and year like 'noviembre de 2021'">
            Crosshare Daily Mini Puzzles for {date}
          </Trans>
        </h2>
        <div css={{ marginBottom: '2em' }}>
          <Markdown text={description} />
        </div>
        {props.puzzles.map(([day, puzzle, cp, isPatron]) => {
          const displayDate = new Date(
            props.year,
            props.month,
            day
          ).toLocaleDateString(loc);
          return (
            <PuzzleResultLink
              key={day}
              puzzle={puzzle}
              showAuthor={true}
              constructorPage={cp}
              constructorIsPatron={isPatron}
              title={t`Daily Mini for ${displayDate}`}
            />
          );
        })}
        <p css={{ textAlign: 'center', paddingBottom: '1em' }}>
          {props.newerLink ? (
            <Link
              css={{ marginRight: '1em' }}
              href={'/dailyminis/' + props.newerLink}
            >
              <Trans>Newer Minis</Trans>
            </Link>
          ) : (
            ''
          )}
          {props.olderLink ? (
            <Link href={'/dailyminis/' + props.olderLink}>
              <Trans>Older Minis</Trans>
            </Link>
          ) : (
            ''
          )}
        </p>
      </div>
    </>
  );
}