import Head from 'next/head';

import { AuthProps, requiresAuth } from '../components/AuthContext';
import { BuilderDBLoader } from '../components/Builder';

export const BuilderPage = (authProps: AuthProps) => {
  const size = 5;
  const grid = new Array(size * size).fill(' ');
  const props = {
    'size': {
      'rows': size,
      'cols': size
    },
    'grid': grid
  };

  const description = 'Build your own crossword puzzles with the Crosshare constructor. ' +
    'Autofill makes grid construction a breeze and once you finish you can publish your ' +
    'puzzle to Crosshare to share with your friends or the world.';
  return <>
    <Head>
      <title>Constructor | Crosshare | crossword puzzle builder</title>
      <meta key="og:title" property="og:title" content='Crosshare Crossword Constructor' />
      <meta key="description" name="description" content={description} />
      <meta key="og:description" property="og:description" content={description} />
    </Head>
    <BuilderDBLoader {...props} {...authProps} />
  </>;
};

export default requiresAuth(BuilderPage);
