import Head from 'next/head';

import { DefaultTopBar } from './TopBar';
import { ConstructorPageT } from '../lib/constructorPage';
import { PuzzleResult } from '../lib/types';
import { PuzzleResultLink } from './PuzzleLink';
import { Link } from './Link';
import { Markdown } from './Markdown';

export interface ConstructorPageProps {
  constructorPage: ConstructorPageT,
  puzzles: Array<PuzzleResult>,
  hasMore: boolean,
}

export const ConstructorPage = (props: ConstructorPageProps) => {
  const username = props.constructorPage.i || props.constructorPage.id;
  const description = 'The latest crossword puzzles from ' + props.constructorPage.n + ' (@' + username + '). ' + props.constructorPage.b;
  const title = props.constructorPage.n + ' (@' + username + ') | Crosshare Crossword Puzzles';
  return <>
    <Head>
      <title>{title}</title>
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="description" name="description" content={description} />
      {props.hasMore ?
        <link rel='next' href={'/' + username + '/' + props.puzzles[props.puzzles.length - 1].publishTime} />
        : ''}
    </Head>
    <DefaultTopBar />
    <div css={{
      margin: '1em',
    }}>
      <h2 css={{ marginBottom: 0 }}>{props.constructorPage.n}</h2>
      <h4><Link href='/[...slug]' as={'/' + username} passHref>@{username}</Link></h4>
      <Markdown text={props.constructorPage.b} />
      {props.puzzles.map((p, i) => <PuzzleResultLink key={i} puzzle={p} showAuthor={false} />)}
      {props.hasMore ?
        <p css={{ textAlign: 'center' }}>
          <Link href='/[...slug]' as={'/' + username + '/' + props.puzzles[props.puzzles.length - 1].publishTime} passHref>More</Link>
        </p>
        : ''}
    </div>
  </>;
};
