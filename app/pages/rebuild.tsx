import Head from 'next/head';
import { requiresAuth } from '../components/AuthHelpers.js';
import { DBLoader } from '../components/DBLoader.js';

export const RebuildPage = () => {
  return (
    <>
      <Head>
        <title>{`Rebuild Word Database | Crosshare | crossword puzzle builder`}</title>
      </Head>
      <DBLoader />
    </>
  );
};

export default requiresAuth(RebuildPage);
