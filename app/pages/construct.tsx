import Head from 'next/head';

import { AuthContext, renderLoginButtonIfNeeded } from '../components/AuthContext';
import { Builder } from '../components/Builder';
import { LoadButton } from '../components/DBLoader';
import { useWordDB } from '../lib/WordDB';
import { useContext } from 'react';
import { FeatureList, FeatureListItem } from '../components/FeatureList';
import { PRIMARY, SMALL_AND_UP, LARGE_AND_UP } from '../lib/style';
import { Link } from '../components/Link';
import { Logo } from '../components/Icons';
import { MdMoneyOff } from 'react-icons/md';
import { IoMdResize, IoMdPhonePortrait } from 'react-icons/io';
import { FaShareSquare, FaChartBar, FaComment, FaMagic, FaBicycle } from 'react-icons/fa';
import { BigQuote } from '../components/BigQuote';

export default function BuilderPage() {
  const [ready, error, loading, setLoaded] = useWordDB();
  const ctx = useContext(AuthContext);
  const loginButton = renderLoginButtonIfNeeded(ctx);

  const size = 5;
  const grid = new Array(size * size).fill(' ');
  const props = {
    'size': {
      'rows': size,
      'cols': size
    },
    'grid': grid
  };

  if (ready && ctx.user) {
    return <Builder {...props} user={ctx.user} isAdmin={ctx.isAdmin} />;
  }
  if (error) {
    console.error(error);
  }

  const description = `Build your own crossword puzzles for free with the Crosshare constructor.
    Autofill makes grid construction a breeze. Once you finish you can publish your
    puzzle to share with your friends or the world.`;
  return <>
    <Head>
      <title>Constructor | Crosshare | crossword puzzle builder</title>
      <meta key="og:title" property="og:title" content='Crosshare Crossword Constructor' />
      <meta key="description" name="description" content={description} />
      <meta key="og:description" property="og:description" content={description} />
    </Head>
    <header css={{
      padding: '0 0.5em',
      backgroundColor: PRIMARY,
      textAlign: 'center',
      color: 'var(--text)',
      paddingTop: '1em',
      minHeight: 400,
      [SMALL_AND_UP]: {
        minHeight: 350,
      },
      [LARGE_AND_UP]: {
        minHeight: 300,
      }
    }}>
      <Link href="/" passHref css={{
        textDecoration: 'none !important',
        cursor: 'pointer',
      }} title="Crosshare Home">
        <Logo width={50} height={50} />
      </Link>
      <h2 css={{ fontSize: 40 }}>Construct crossword puzzles in a flash</h2>
      {ctx.loading ?
        <p>Checking if you have an exisiting account...</p>
        :
        (
          loginButton ?
            <>
              <p>To construct a puzzle, you need to log in with Google first. We use your sign in to keep track of the puzzles you&apos;ve created.</p>
              {loginButton}
            </>
            :
            (
              loading ?
                <p>Checking for existing word database...</p>
                :
                <>
                  <p>The first time you use the constructor on a new browser Crosshare needs
              to download and build a word database.</p>
                  <LoadButton buttonText='Build Database' onComplete={() => setLoaded()} />
                </>
            )
        )
      }
    </header>
    <BigQuote
      quote="The Crosshare constructor helps me build better puzzles faster. The interface is more intuitive than Crossfire's and the autofill feature works far more efficiently."
      attribution={<>Will of <Link href='/[...slug]' as={'/WWMC'} passHref>Will&apos;s Weekly Meta Crossword</Link></>}
    />
    <FeatureList>
      <FeatureListItem icon={<MdMoneyOff />} heading="It's 100% free" text="Constructing puzzles on Crosshare is always free. You can publish as many puzzles as you'd like and share with them with as many solvers as you can find." />
      <FeatureListItem icon={<FaMagic />} heading="Fill grids like magic" text="The autofiller instantly fills in the rest of the grid as enter your fill. Press the `Enter` key to shake things up and get a different autofill." />
      <FeatureListItem icon={<IoMdResize />} heading='All shapes and sizes are welcome' text='Crosshare supports grids of any size. The interface is optimized to fit as large a grid (and as many clues) as possible on any devices you and your solvers are using.' />
      <FeatureListItem icon={<FaBicycle />} heading='Construct on the go' text='The Crosshare constructor works on desktops, tablets, and phones. Construct a mini puzzle while waiting for the bus, or work on a grid from your iPad on the couch.' />
      <FeatureListItem icon={<IoMdPhonePortrait />} heading="An app-like experience" text="Crosshare's solving interface is mobile-first and makes solving your puzzle as smooth as butter on desktops, tablets, and phones. Almost 50% of solvers are using mobile devices - don't let a poor interface keep them from solving your puzzles. Crosshare also supports dark mode, grid highlighting and tooltips for referenced entries, and more best-in-class features." />
      <FeatureListItem icon={<FaShareSquare />} heading="Crosswords are social" text="Crosshare puzzles are made to share. Our search engine optimization and social tags will get as many people solving your puzzle as possible. Social media posts automatically include grid preview images, puzzle titles, and teaser clues." />
      <FeatureListItem icon={<FaChartBar />} heading="Advanced analytics" text="As a constructor, you get access to advanced analytics about your puzzle. Find out how many people solve your puzzle, how long it takes them, and view heatmaps of exactly which cells they get stuck on." />
      <FeatureListItem icon={<FaComment />} heading="An instant crossword blog" text="After constructing your first puzzle you can reserve your own URL and instantly create a crossword blog. You get a centralized page to share and talk about all of your puzzles. Commenting is enabled from the start and Crosshare is the only place where comments feature solve times, clue tooltips, and other crossword specific features." />
    </FeatureList>
  </>;
}
