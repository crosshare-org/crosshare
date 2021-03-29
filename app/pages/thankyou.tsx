import Head from 'next/head';
import { Emoji } from '../components/Emoji';
import { DefaultTopBar } from '../components/TopBar';

export default function ThankYouPage() {
  return (
    <>
      <Head>
        <title>Thank you | Crosshare Crossword Constructor and Puzzles</title>
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em' }}>
        <h2>
          Thank you! <Emoji symbol="🥰" />
        </h2>
        <p>Your donation will help keep Crosshare going!</p>
      </div>
    </>
  );
}
