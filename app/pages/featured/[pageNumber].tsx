import { GetServerSideProps } from 'next';

import { ErrorPage } from '../../components/ErrorPage';
import { getPuzzlesForFeatured } from '../../lib/serverOnly';
import { ServerPuzzleResult } from '../../lib/types';
import { userIdToPage } from '../../lib/constructorPage';
import Head from 'next/head';
import { DefaultTopBar } from '../../components/TopBar';
import { HUGE_AND_UP, MAX_WIDTH } from '../../lib/style';
import { PuzzleResultLink } from '../../components/PuzzleLink';
import { Link } from '../../components/Link';

interface FeaturedPageProps {
  puzzles: Array<ServerPuzzleResult>,
  nextPage: number | null,
  currentPage: number,
  prevPage: number | null,
}
interface ErrorProps {
  error: string
}
type PageProps = FeaturedPageProps | ErrorProps;

export const PAGE_SIZE = 20;

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ res, params }) => {
  if (!params ?.pageNumber || Array.isArray(params.pageNumber)) {
    return { props: { error: 'Bad params' } };
  }

  const page = parseInt(params.pageNumber);
  if (page < 1 || page.toString() !== params.pageNumber) {
    return { props: { error: 'Bad page number' } };
  }
  const [puzzlesWithoutConstructor, index] = await getPuzzlesForFeatured(page, PAGE_SIZE);
  const puzzles = await Promise.all(puzzlesWithoutConstructor.map(async p => ({ ...p, constructorPage: await userIdToPage(p.authorId) })));
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  return {
    props: {
      puzzles,
      currentPage: page,
      prevPage: page > 0 ? page - 1 : null,
      nextPage: index.i.length > (page + 1) * PAGE_SIZE ? page + 1 : null,
    }
  };
};

export default function FeaturedPageHandler(props: PageProps) {
  if ('error' in props) {
    return <ErrorPage title='Something Went Wrong'>
      <p>Sorry! Something went wrong while loading that page.</p>
      {props.error ? <p>{props.error}</p> : ''}
    </ErrorPage>;
  }

  const title = `Featured Puzzles | Page ${props.currentPage} | Crosshare`;
  const description = 'Featured puzzles are puzzles selected by Crosshare that we found to be particularly fun and well constructed. Enjoy!';

  return <>
    <Head>
      <title>{title}</title>
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="description" name="description" content={description} />
      <link rel="canonical" href={'https://crosshare.org/featured/' + props.currentPage} />
      {props.prevPage === 0 ?
        <link rel='prev' href={'https://crosshare.org/'} />
        : ''}
      {props.prevPage ?
        <link rel='prev' href={'https://crosshare.org/featured/' + props.prevPage} />
        : ''}
      {props.nextPage !== null ?
        <link rel='next' href={'https://crosshare.org/featured/' + props.nextPage} />
        : ''}
    </Head>
    <DefaultTopBar />
    <div css={{
      margin: '1em',
      [HUGE_AND_UP]: {
        maxWidth: MAX_WIDTH,
        margin: '1em auto',
      },
    }}>
      <h1 css={{ fontSize: '1.4em', marginBottom: 0 }}>Crosshare Featured Puzzles</h1>
      <p>Featured puzzles are puzzles selected by Crosshare that we found to be particularly fun and well constructed. Enjoy!</p>
      {props.puzzles.map((p, i) => <PuzzleResultLink key={i} puzzle={p} constructorPage={p.constructorPage} showAuthor={true} />)}
      {props.nextPage || props.prevPage !== null ?
        <p css={{ textAlign: 'center' }}>
          {props.prevPage === 0 ?
            <Link css={{ marginRight: '2em' }} href='/' passHref>← Newer Puzzles</Link>
            : ''}
          {props.prevPage ?
            <Link css={{ marginRight: '2em' }} href='/featured/[pageNumber]' as={'/featured/' + props.prevPage} passHref>← Newer Puzzles</Link>
            : ''}
          {props.nextPage !== null ?
            <Link href='/featured/[pageNumber]' as={'/featured/' + props.nextPage} passHref>Older Puzzles →</Link>
            : ''}
        </p>
        : ''}
    </div>
  </>;
}
