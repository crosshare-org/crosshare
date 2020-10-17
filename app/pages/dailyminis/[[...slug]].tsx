import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { Link } from '../../components/Link';
import { ErrorPage } from '../../components/ErrorPage';
import { App } from '../../lib/firebaseWrapper';
import { CategoryIndexV, CategoryIndexT, addZeros, getDateString, prettifyDateString } from '../../lib/dbtypes';
import { PuzzleResult, puzzleFromDB } from '../../lib/types';
import { ConstructorPageT } from '../../lib/constructorPage';
import { getPuzzle } from '../../lib/puzzleCache';
import { Markdown } from '../../components/Markdown';
import { DefaultTopBar } from '../../components/TopBar';
import { PuzzleResultLink } from '../../components/PuzzleLink';
import { userIdToPage } from '../../lib/serverOnly';

export interface DailyMiniProps {
  puzzles: Array<[string, PuzzleResult, ConstructorPageT | null]>,
  year: number,
  month: number,
  olderLink?: string,
  newerLink?: string,
}
interface ErrorProps {
  error: string
}
type PageProps = DailyMiniProps | ErrorProps

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ res, params }) => {
  const slug = params ?.slug;
  let year: number;
  let month: number;
  if (!slug) {
    const today = new Date();
    year = today.getUTCFullYear();
    month = today.getUTCMonth();
  } else if (Array.isArray(slug) && slug.length === 2) {
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

const MonthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function puzzlesListForCategoryIndex(idx: CategoryIndexT, page: [number, number]): Promise<Array<[string, PuzzleResult, ConstructorPageT | null]>> {
  const today = new Date();
  const prefix: string = page[0] + '-' + page[1] + '-';
  const ds = addZeros(getDateString(today));
  return Promise.all(Object.entries(idx)
    .filter(([k, _v]) => k.startsWith(prefix))
    .map(([k, v]): [string, string] => [addZeros(k), v])
    .filter(([k, _v]) => k <= ds)
    .sort((a, b) => a[0] > b[0] ? -1 : 1)
    .map(async ([dateString, puzzleId]): Promise<[string, PuzzleResult, ConstructorPageT | null]> => {
      const dbpuzzle = await getPuzzle(puzzleId);
      if (!dbpuzzle) {
        throw new Error('bad puzzleId in index: ' + puzzleId);
      }
      const puzzle = puzzleFromDB(dbpuzzle);
      const cp = await userIdToPage(dbpuzzle.a);
      return [prettifyDateString(dateString), { ...puzzle, id: puzzleId }, cp];
    })
  );
}

// We export this so we can use it for testing
export async function propsForDailyMini(year: number, month: number): Promise<PageProps> {
  const today = new Date();
  const db = App.firestore();
  const dbres = await db.collection('categories').doc('dailymini').get();
  if (!dbres.exists) {
    return { error: 'Couldnt get category index' };
  }
  const validationResult = CategoryIndexV.decode(dbres.data());
  if (isRight(validationResult)) {
    console.log('loaded category index from db');
    const puzzles = await puzzlesListForCategoryIndex(validationResult.right, [year, month]);
    if (!puzzles.length) {
      return { error: 'No minis for that month' };
    }
    return {
      year: year,
      month: month,
      puzzles: puzzles,
      ...(today.getUTCFullYear() !== year || today.getUTCMonth() !== month ?
        { newerLink: (month + 1 === 12 ? `${year + 1}/1` : `${year}/${month + 2}`) }
        : null),
      ...(month === 0 && `${year - 1}-11-31` in validationResult.right ?
        { olderLink: `${year - 1}/11` } : (`${year}-${month - 1}-28` in validationResult.right ?
          { olderLink: `${year}/${month}` }
          : null
        )
      )
    };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return { error: 'Invalid category index' };
  }
}

export default function DailyMiniPage(props: PageProps) {
  if ('error' in props) {
    return <ErrorPage title='Category Not Found'>
      <p>We&apos;re sorry, we couldn&apos;t find the category page you requested: {props.error}</p>
      <p>Try the <Link href="/" passHref>homepage</Link>.</p>
    </ErrorPage>;
  }
  const description = `Crosshare features a free daily mini crossword every day of the week.
  These puzzles are a great way to give your brain a bite-sized challenge, and to
  learn how crosswords work before taking on larger puzzles.

  Mini puzzles are most often 5x5, but can be other sizes as well - sometimes
  the weekend minis are a bit larger. Any small sized puzzle you publish to Crosshare
  will be eligible for selection as a daily mini!`;
  const date = `${MonthNames[props.month]} ${props.year}`;
  return <>
    <Head>
      <title>Daily Mini Puzzles for {date} | Crosshare crosswords</title>
      <meta key="og:title" property="og:title" content={'Daily Mini Puzzles for ' + date} />
      <meta key="description" name="description" content={description} />
      <meta key="og:description" property="og:description" content={description} />
      <link rel="canonical" href={`https://crosshare.org/dailyminis/${props.year}/${props.month + 1}`} />
      {props.olderLink ?
        <link rel='next' href={'https://crosshare.org/dailyminis/' + props.olderLink} />
        : ''}
      {props.newerLink ?
        <link rel='next' href={'https://crosshare.org/dailyminis/' + props.newerLink} />
        : ''}
    </Head>
    <DefaultTopBar />
    <div css={{ margin: '1em', }}>
      <h2>Crosshare Daily Mini Puzzles for {date}</h2>
      <div css={{ marginBottom: '2em' }}>
        <Markdown text={description} />
      </div>
      {props.puzzles.map(([dateString, puzzle, cp]) =>
        <PuzzleResultLink key={dateString} puzzle={puzzle} showAuthor={true} constructorPage={cp} title={'Daily Mini for ' + dateString} />
      )}
      <p css={{ textAlign: 'center', paddingBottom: '1em' }}>
        {props.newerLink ?
          <Link css={{ marginRight: '1em' }} href='/dailyminis/[[...slug]]' as={'/dailyminis/' + props.newerLink} passHref>Newer Minis</Link>
          : ''
        }
        {props.olderLink ?
          <Link href='/dailyminis/[[...slug]]' as={'/dailyminis/' + props.olderLink} passHref>Older Minis</Link>
          : ''
        }
      </p>
    </div>
  </>;
}
