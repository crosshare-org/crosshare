import Head from 'next/head';

import {
  AuthContext,
  renderLoginButtonIfNeeded,
} from '../components/AuthContext';
import { Builder } from '../components/Builder';
import { LoadButton } from '../components/DBLoader';
import { useWordDB } from '../lib/WordDB';
import { useContext, useState, ReactNode } from 'react';
import { FeatureList, FeatureListItem } from '../components/FeatureList';
import { Link } from '../components/Link';
import { MdMoneyOff } from 'react-icons/md';
import { IoMdResize, IoMdPhonePortrait } from 'react-icons/io';
import {
  FaShareSquare,
  FaChartBar,
  FaComment,
  FaMagic,
  FaBicycle,
} from 'react-icons/fa';
import { BigQuote } from '../components/BigQuote';
import { Hero } from '../components/Hero';
import { Button } from '../components/Buttons';
import { SMALL_AND_UP, LARGE_AND_UP } from '../lib/style';
import { Emoji } from '../components/Emoji';
import { ContactLinks } from '../components/ContactLinks';

export default function BuilderPage() {
  const [ready, error, loading, setLoaded] = useWordDB();
  const [showBuilder, setShowBuilder] = useState(false);
  const ctx = useContext(AuthContext);
  const loginButton = renderLoginButtonIfNeeded(ctx);

  const size = 5;
  const grid = new Array(size * size).fill(' ');
  const props = {
    size: {
      rows: size,
      cols: size,
    },
    grid: grid,
  };

  if (ready && ctx.user && showBuilder) {
    return <Builder {...props} user={ctx.user} isAdmin={ctx.isAdmin} />;
  }
  if (error) {
    console.error(error);
  }

  let heroContent: ReactNode;
  if (ctx.loading) {
    heroContent = <p>Checking if you have an existing account...</p>;
  } else if (loginButton) {
    heroContent = (
      <>
        <p>
          To construct a puzzle, you need to log in with Google first. We use
          your sign in to keep track of the puzzles you&apos;ve created.
        </p>
        {loginButton}
      </>
    );
  } else if (loading) {
    heroContent = <p>Checking for existing word database...</p>;
  } else if (!ready) {
    heroContent = (
      <>
        <p>
          The first time you use the constructor on a new browser Crosshare
          needs to download and build a word database. Occassional rebuilds are
          needed as Crosshare adds new words.
        </p>
        <LoadButton
          buttonText="Build Database"
          onComplete={() => setLoaded()}
        />
      </>
    );
  } else {
    heroContent = (
      <>
        <p>
          <Button
            css={{
              fontSize: '1.5em',
              marginTop: '0.75em',
            }}
            onClick={() => setShowBuilder(true)}
            text="Launch Constructor"
          />
        </p>
      </>
    );
  }

  const description = `Build your own crossword puzzles for free with the Crosshare constructor.
    Autofill makes grid construction a breeze. Once you finish you can publish your
    puzzle to share with your friends or the world.`;

  return (
    <>
      <Head>
        <title>Constructor | Crosshare | crossword puzzle builder</title>
        <meta
          key="og:title"
          property="og:title"
          content="Crosshare Crossword Constructor"
        />
        <meta key="description" name="description" content={description} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
      </Head>
      <Hero text="Construct crossword puzzles in a flash">{heroContent}</Hero>
      <BigQuote
        quote="The Crosshare constructor helps me build better puzzles faster. The interface is more intuitive than Crossfire's and the autofill feature works far more efficiently."
        attribution={
          <>
            Will Pfadenhauer of{' '}
            <Link href={'/PBWMC'}>
              Pandora&apos;s Blocks Weekly Meta Crossword
            </Link>
          </>
        }
      />
      <FeatureList>
        <FeatureListItem
          icon={<MdMoneyOff />}
          heading="It's 100% free"
          text="Constructing puzzles on Crosshare is always free. You can publish as many puzzles as you'd like and share with them with as many solvers as you can find."
        />
        <FeatureListItem
          icon={<FaMagic />}
          heading="Fill grids like magic"
          text="The autofiller instantly fills in the rest of the grid as enter your fill. Press the `Enter` key to shake things up and get a different autofill."
        />
        <FeatureListItem
          icon={<IoMdResize />}
          heading="All shapes and sizes are welcome"
          text="Crosshare supports grids of any size. The interface is optimized to fit as large a grid (and as many clues) as possible on any devices you and your solvers are using."
        />
        <FeatureListItem
          icon={<FaBicycle />}
          heading="Construct on the go"
          text="The Crosshare constructor works on desktops, tablets, and phones. Construct a mini puzzle while waiting for the bus, or work on a grid from your iPad on the couch."
        />
        <FeatureListItem
          icon={<IoMdPhonePortrait />}
          heading="An app-like experience"
          text="Crosshare's solving interface is mobile-first and makes solving your puzzle as smooth as butter on desktops, tablets, and phones. Almost 50% of solvers are using mobile devices - don't let a poor interface keep them from solving your puzzles. Crosshare also supports dark mode, grid highlighting and tooltips for referenced entries, and more best-in-class features."
        />
        <FeatureListItem
          icon={<FaShareSquare />}
          heading="Crosswords are social"
          text="Crosshare puzzles are made to share. Our search engine optimization and social tags will get as many people solving your puzzle as possible. Social media posts automatically include grid preview images, puzzle titles, and teaser clues."
        />
        <FeatureListItem
          icon={<FaChartBar />}
          heading="Advanced analytics"
          text="As a constructor, you get access to advanced analytics about your puzzle. Find out how many people solve your puzzle, how long it takes them, and view heatmaps of exactly which cells they get stuck on."
        />
        <FeatureListItem
          icon={<FaComment />}
          heading="An instant crossword blog"
          text="After constructing your first puzzle you can reserve your own URL and instantly create a crossword blog. You get a centralized page to share and talk about all of your puzzles. Commenting is enabled from the start and Crosshare is the only place where comments feature solve times, clue tooltips, and other crossword specific features."
        />
      </FeatureList>
      <div
        css={{
          padding: '0 0.5em',
          backgroundColor: 'var(--primary)',
          textAlign: 'center',
          color: 'var(--text)',
          paddingTop: '1em',
          minHeight: 225,
          [SMALL_AND_UP]: {
            minHeight: 175,
          },
          [LARGE_AND_UP]: {
            minHeight: 125,
          },
        }}
      >
        {heroContent}
      </div>
      <div
        css={{
          display: 'flex',
          margin: '1em',
          flexWrap: 'wrap',
        }}
      >
        <div
          css={{
            width: '100%',
            flex: 'none',
            [LARGE_AND_UP]: {
              flex: '1 1 0',
              marginRight: '1em',
            },
          }}
        >
          <h2 css={{ textAlign: 'center' }}>New to making crosswords?</h2>
          <p>
            Don’t be intimidated! Constructing great crosswords takes a lot of
            practice, but it’s easy to get started. When you first launch the
            constructor, Crosshare defaults you to a 5x5 mini grid (to create a
            different sized puzzle click on “More” in the top bar and then click
            “New Puzzle”). Mini puzzles are a great way to get started because
            you don’t need to worry so much about the grid layout - you just
            need to focus on getting fill you like and coming up with fun clues.
          </p>
          <h3>Filling the grid</h3>
          <p>
            After launching the constructor, click anywhere in the grid and
            start typing your first fill entry. As you type you’ll notice the
            Crosshare autofiller magically fills in the rest of the grid. You
            shouldn’t rely exclusively on the autofiller - the wordlist(s)
            beside the grid give you other options for the currently selected
            entry. You can also use any other word you like even if it’s not in
            the list - it’s all COVFEFE.
          </p>
          <h3>Using black squares</h3>
          <p>
            You can create a black square by typing the ‘.’ key on your keyboard
            or hitting the all black key on the keyboard if you’re on a mobile
            device. Select the square and hit ‘.’ or type any letter to toggle
            it back. Placing black squares is an art form for larger grids. This{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.nytimes.com/2018/05/11/crosswords/how-to-make-crossword-puzzle-grid.html"
            >
              nytimes article
            </a>{' '}
            does a pretty good job of introducing some of the ideas behind where
            they should go.
          </p>
          <h3>Finalizing the grid</h3>
          <p>
            It can take a lot of tweaking to get a grid that you’re happy with.
            Maybe you really want to work a specific word in but every time you
            try it makes for poor (or no!) choices elsewhere. The best thing to
            do is to try to stay flexible and keep playing with different
            options until it all clicks. The Crosshare autofiller can help this
            along by showing you different candidate fills - every time you
            press the ‘Enter’ key (or click ‘Rerun Autofill’ in the top bar)
            you’ll get a slightly different fill.
          </p>
          <h3>Adding clues</h3>
          <p>
            Once your grid is filled in click the “Clues” button in the top bar
            to go to the clue view. You’ll see every word in your grid with an
            input next to it for your clue. Try to come up with your own
            interesting clue for each word. It’s important to have some easier
            clues (especially on mini puzzles!) so that solvers have a place to
            start. This{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.nytimes.com/2018/07/11/crosswords/how-to-make-a-crossword-puzzle-4.html"
            >
              nytimes article
            </a>{' '}
            talks about cluing and might be a good read for a beginner. It can
            also help to look up words in a clue database like{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://crosswordtracker.com/"
            >
              crosswordtracker
            </a>{' '}
            to see how other constructors have clued them. The only way to get
            better at cluing, though, is to force yourself to come up with some
            of your own!
          </p>
          <h3>Publishing</h3>
          <p>
            After all of your clues are filled in, come up with a title for your
            puzzle. This gets entered at the top of the clue view. Now click
            “Back to Grid”, give it one more look, and hit “Publish”. After
            publishing, Crosshare will redirect you to your puzzle’s new home.
            You might want to add a comment (solvers will see it they finish
            solving). When you’re ready, copy the link and share it with as many
            solvers as you can find! As the author, you’ll be able to view solve
            stats for your puzzle - click “More” and then “Stats” from the
            puzzle page.
          </p>
          <p>
            That’s all there is to it! If you’re looking for more info about
            constructing your first puzzle,{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://medium.com/@that314guy/creating-and-publishing-my-first-crossword-154bc93ff298"
            >
              this article
            </a>{' '}
            has a lot of good information.
          </p>
        </div>
        <div
          css={{
            width: '100%',
            flex: 'none',
            [LARGE_AND_UP]: {
              flex: '1 1 0',
              marginLeft: '1em',
            },
          }}
        >
          <h2 css={{ textAlign: 'center' }}>FAQ</h2>
          <h3>What if I have an existing puzzle I’d like to upload?</h3>
          <p>
            Crosshare supports .puz uploading <Link href="/upload">here</Link>.
          </p>
          <h3>Does Crosshare support rebuses?</h3>
          <p>
            Yup, both the constructor and the solver support entering rebuses -
            hit ‘Escape’ (or ‘Rebus’ on your mobile device keyboard) to enter a
            rebus. The autofiller supports filling around them, too{' '}
            <Emoji symbol="😉" />.
          </p>
          <h3>What about circled / shaded squares?</h3>
          <p>Yup, and yup!</p>
          <h3>How do clue cross-references work?</h3>
          <p>
            When you use something like <i>7-Across</i> or <i>5D</i> in a clue
            it will automatically get linked to the referenced clue. This sets
            up clue highlighting and tooltips for solvers. You can also prefix
            clues with a &lsquo;*&rsquo; and use phrases like &ldquo;the starred
            clues&rdquo; in another clue to set up references to them.
          </p>
          <h3>
            What if my clue uses <i>3D</i> but it&apos;s not supposed to be a
            cross-reference?
          </h3>
          <p>
            You can prefix a clue with &lsquo;!@&rsquo; to tell Crosshare to
            skip it when scanning for clue references. Solvers won&apos;t see
            the !@, obviously.
          </p>
          <h3>Where does the wordlist come from?</h3>
          <p>
            Crosshare uses a custom wordlist that’s mostly based off of{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://peterbroda.me/crosswords/wordlist/"
            >
              Peter Broda’s list
            </a>{' '}
            with some additional words that have frequently appeared in NYT
            puzzles.
          </p>
          <h3>Can I use my own wordlist?</h3>
          <p>Custom wordlists / wordlist editing will be released soon.</p>
          <h3>Can I create rectangular grids?</h3>
          <p>
            Yup, you can use any dimensions you want. Better yet, both the
            constructor and solver interfaces optimize around whatever size grid
            you use - to maximize usability on smaller screens.
          </p>
          <h3>
            Does the constructor work on (iPad / iPhone / Android / Windows / OS
            X / Linux)?
          </h3>
          <p>
            The Crosshare constructor should work on any modern browser, and is
            optimized for mobile devices. For the first time you can have a
            first class constructing experience on your iPad. If you have any
            issues on any device, please get in touch and let me know!
          </p>
          <h3>How come I can only work on one puzzle at a time?</h3>
          <p>Saving and loading multiple puzzles is coming soon.</p>
          <h3>Will Crosshare ever have an offline mode?</h3>
          <p>
            I know I’m sounding like a broken record, but this is coming soon
            too!
          </p>
          <h3>Can I export my puzzle as a PDF or .puz file?</h3>
          <p>
            After publishing a puzzle both PDF and .puz become available for
            solvers. To get a nicely formatted PDF for printing: click “More”
            and then “Print puzzle”. To download a .puz click “More” and then
            “Download .puz”
          </p>
          <h3>What types of grid symmetry are supported?</h3>
          <p>ALL OF THEM.</p>
          <h3>What if I have a different question?</h3>
          <p>
            Please get in touch via <ContactLinks />.
          </p>
        </div>
      </div>
    </>
  );
}
