import Head from 'next/head';

import { DefaultTopBar } from '../components/TopBar';
import { ConstructorPageT } from '../lib/constructorPage';
import { PuzzleResult } from '../lib/types';
import { PuzzleResultLink } from '../components/PuzzleLink';
import { Link } from '../components/Link';

export interface ConstructorPageProps {
  constructorPage: ConstructorPageT,
  puzzles: Array<PuzzleResult>,
  hasMore: boolean,
}

export const ConstructorPage = (props: ConstructorPageProps) => {
  return <>
    <Head>
      <title>{props.constructorPage.n} (@{props.constructorPage.id}) | Crosshare Crossword Puzzles</title>
    </Head>
    <DefaultTopBar />
    <div css={{
      margin: '1em',
    }}>
      <h2 css={{ marginBottom: 0 }}>{props.constructorPage.n}</h2>
      <h4><Link href='/[...slug]' as={'/' + props.constructorPage.id} passHref>@{props.constructorPage.id}</Link></h4>
      <p>{props.constructorPage.b}</p>
      {props.puzzles.map((p, i) => <PuzzleResultLink key={i} puzzle={p} />)}
      {props.hasMore ?
        <p css={{ textAlign: 'center' }}>
          <Link href='/[...slug]' as={'/' + props.constructorPage.id + '/' + props.puzzles[props.puzzles.length - 1].publishTime} passHref>More</Link>
        </p>
        : ''}
    </div>
  </>;
};
