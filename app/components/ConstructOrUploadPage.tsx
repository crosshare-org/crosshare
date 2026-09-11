import Head from 'next/head';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { CgSidebarRight } from 'react-icons/cg';
import {
  FaBicycle,
  FaCat,
  FaChartBar,
  FaCode,
  FaComment,
  FaMagic,
  FaQuestionCircle,
  FaShareSquare,
} from 'react-icons/fa';
import { IoMdPhonePortrait, IoMdResize } from 'react-icons/io';
import { MdMoneyOff } from 'react-icons/md';
import { useWordDB } from '../lib/WordDB.js';
import { importFile } from '../lib/converter.js';
import { STORAGE_KEY, clsx } from '../lib/utils.js';
import { AuthContext } from './AuthContext.js';
import { renderLoginButtonIfNeeded } from './AuthHelpers.js';
import { BigQuote } from './BigQuote.js';
import { Builder, BuilderProps } from './Builder.js';
import { Button } from './Buttons.js';
import styles from './ConstructOrUploadPage.module.scss';
import { ContactLinks } from './ContactLinks.js';
import { LoadButton } from './DBLoader.js';
import { Emoji } from './Emoji.js';
import { FeatureList, FeatureListItem } from './FeatureList.js';
import { Hero } from './Hero.js';
import { Link, LinkButton } from './Link.js';

export function ConstructOrUploadPage({ isUpload }: { isUpload: boolean }) {
  const [dbReady, dbError, dbLoading, setDbLoaded] = useWordDB();
  const [showBuilder, setShowBuilder] = useState(false);
  const ctx = useContext(AuthContext);
  const loginButton = renderLoginButtonIfNeeded(ctx);

  const size = 5;
  const grid = new Array<string>(size * size).fill(' ');
  const props = {
    width: size,
    height: size,
    grid: grid,
  };
  const [builderProps, setBuilderProps] = useState<BuilderProps>(props);

  const [puzzleInProgress, setPuzzleInProgress] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== null) {
      setPuzzleInProgress(true);
    }
  }, []);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  function handleFile(f: FileList | null) {
    if (!f?.[0]) {
      setUploadError('No file selected');
      return;
    }
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!fileReader.result) {
        setUploadError('No file result');
      } else if (typeof fileReader.result === 'string') {
        setUploadError('Failed to read as binary');
      } else {
        try {
          const puzzle = importFile(new Uint8Array(fileReader.result));
          if (!puzzle) {
            setUploadError('Failed to parse file');
          } else {
            setBuilderProps(puzzle);
            setShowBuilder(true);
          }
        } catch (error) {
          console.error(error);
          if (error instanceof Error) {
            setUploadError(error.message);
          } else {
            setUploadError('Could not import file');
          }
        }
      }
    };
    fileReader.readAsArrayBuffer(f[0]);
  }

  if (dbReady && ctx.user && showBuilder) {
    return (
      <Builder
        {...builderProps}
        user={ctx.user}
        isAdmin={ctx.isAdmin}
        prefs={ctx.prefs}
        isUpload={isUpload}
      />
    );
  }
  if (dbError) {
    console.error(dbError);
  }

  let heroContent: ReactNode;
  if (uploadError) {
    heroContent = (
      <>
        <p>Error: {uploadError}</p>
        <p>
          If your puzzle isn&apos;t uploading correctly please get in touch via{' '}
          <ContactLinks /> so we can help!
        </p>
      </>
    );
  } else if (ctx.loading) {
    heroContent = <p>Checking if you have an existing account...</p>;
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  } else if (loginButton) {
    heroContent = (
      <>
        <p>
          To {isUpload ? 'upload' : 'construct'} a puzzle, you need to log in
          with Google first. We use your sign in to keep track of the puzzles
          you&apos;ve created.
        </p>
        {loginButton}
      </>
    );
  } else if (dbLoading) {
    heroContent = <p>Checking for existing word database...</p>;
  } else if (!dbReady) {
    heroContent = (
      <>
        <p>
          The first time you construct/upload on a new browser Crosshare needs
          to download and build a word database. Occassional rebuilds are needed
          as Crosshare adds new words.
        </p>
        <LoadButton
          buttonText="Build Database"
          onComplete={() => {
            setDbLoaded();
          }}
        />
      </>
    );
  } else if (isUpload && puzzleInProgress) {
    console.log('here');
    heroContent = (
      <>
        <p>
          You already have a puzzle under construction on Crosshare. If you
          upload a puzzle now your existing construction will be permanently
          lost. Please go to the <Link href="/construct">constructor</Link>{' '}
          first to publish it, export it, or confirm it is OK to lose.
        </p>
        <p>Type DELETE to confirm deletion of your work in progress.</p>
        <div className="paddingBottom1em">
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => {
              setDeleteConfirmation(e.target.value);
            }}
          />
          <Button
            className={clsx(styles.deleteBtn, 'marginLeft1em')}
            text="Confirm Delete"
            disabled={deleteConfirmation.toLowerCase() !== 'delete'}
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setPuzzleInProgress(false);
            }}
          />
        </div>
      </>
    );
  } else if (isUpload) {
    heroContent = (
      <label>
        <p>
          Select a .puz or .ipuz file to upload - you&apos;ll be able to review
          and edit the puzzle before publishing
        </p>
        <input
          className={styles.fileInput}
          type="file"
          accept=".puz,.ipuz,application/json"
          onChange={(e) => {
            handleFile(e.target.files);
          }}
        />
      </label>
    );
  } else {
    heroContent = (
      <>
        <p>
          <Button
            className={styles.launch}
            onClick={() => {
              setShowBuilder(true);
            }}
            text="Launch Constructor"
          />
        </p>
      </>
    );
  }

  const description = isUpload
    ? 'Import your existing puzzle to share it on Crosshare. Get your .puz and .ipuz files playable on the web. Crosshare gives your solvers a first-class experience on any device, and gives you access to statistics about solves.'
    : `Build your own crossword puzzles for free with the Crosshare constructor.
    Autofill makes grid construction a breeze. Once you finish you can publish your
    puzzle to share with your friends or the world.`;

  return (
    <>
      <Head>
        <title>
          {isUpload
            ? `Upload/Import Crossword Puzzles | Crosshare`
            : `Constructor | Crosshare | crossword puzzle builder`}
        </title>
        <meta
          key="og:title"
          property="og:title"
          content={
            isUpload
              ? 'Crosshare Crossword Upload / Import'
              : 'Crosshare Crossword Constructor'
          }
        />
        <meta key="description" name="description" content={description} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
      </Head>
      <Hero
        text={
          isUpload
            ? 'Your crossword puzzles deserve to get shared'
            : 'Construct crossword puzzles in a flash'
        }
      >
        {heroContent}
      </Hero>
      <BigQuote
        quote={
          isUpload
            ? "Crosshare changed the way I share my puzzles. The analytics allow me to better understand which parts of my grids are most difficult for solvers. It's a big part of why WWMC started and is still running today."
            : "The Crosshare constructor helps me build better puzzles faster. The interface is more intuitive than Crossfire's and the autofill feature works far more efficiently."
        }
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
          text="Constructing and sharing puzzles on Crosshare is always free. You can publish as many puzzles as you'd like and share with them with as many solvers as you can find."
        />
        <FeatureListItem
          icon={<FaMagic />}
          heading="Fill grids like magic"
          text="The autofiller instantly fills in the rest of the grid as you enter your fill. Press the `Enter` key to shake things up and get a different autofill."
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
        <FeatureListItem
          icon={<FaQuestionCircle />}
          heading="First class meta puzzle support"
          text="Crosshare is the only puzzle host that has built in support for meta/contest crosswords including submission tracking, a leaderboard, and detailed statistics."
        />
        <FeatureListItem
          icon={<FaCode />}
          heading="Dead simple embedding"
          text="Any of your puzzles can be embedded on another site with just a few clicks."
        />
        <FeatureListItem
          icon={<CgSidebarRight />}
          heading="Barred grids"
          text="Barred crosswords (and combinations of bars and blocks) have first class support in the constructor and the solving interface."
        />
        <FeatureListItem
          icon={<FaCat />}
          heading="Schrödinger puzzles and bidirectional rebuses"
          text="Crosshare also natively supports puzzles with an arbitrary number of valid solutions. The alternate solutions are shown to the solver after the grid is complete to make sure they have the aha moment."
        />
      </FeatureList>
      <div className={styles.heroWrap}>
        {isUpload ? (
          <>
            <h3>Don’t have a .puz or .ipuz file to upload?</h3>
            <LinkButton
              className={clsx('marginBottom1em', styles.launch)}
              href="/construct"
            >
              Build one now with the Crosshare Constructor
            </LinkButton>
          </>
        ) : (
          heroContent
        )}
      </div>
      <div className={styles.main}>
        <div className={styles.starting}>
          <h2 className="textAlignCenter">New to making crosswords?</h2>
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
        <div className={styles.faq}>
          <h2 className="textAlignCenter">FAQ</h2>
          <h3>What if I have an existing puzzle I’d like to upload?</h3>
          <p>
            Crosshare supports .puz and .ipuz uploading{' '}
            <Link href="/upload">here</Link>.
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
            Crosshare uses a custom wordlist that’s mostly based off{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.spreadthewordlist.com/"
            >
              spread the word(list)
            </a>
            , with additions from{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://peterbroda.me/crosswords/wordlist/"
            >
              Peter Broda’s list
            </a>
            ,{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://twitter.com/ewojcik"
            >
              Erica’s
            </a>{' '}
            expanded name list, and some additional words that have frequently
            appeared in NYT puzzles.
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
          <h3>Can I work on more than one puzzle at a time?</h3>
          <p>
            Saving and loading multiple puzzles is coming soon. In the meantime
            you can use the export/import .puz features to save a local copy of
            a puzzle in progress and then import it again later.
          </p>
          <h3>Will Crosshare ever have an offline mode?</h3>
          <p>
            I know I’m sounding like a broken record, but this is coming soon
            too!
          </p>
          <h3>Can I export my puzzle as a PDF or .puz file?</h3>
          <p>
            You can export a .puz file directly from the constructor. After
            publishing a puzzle both PDF and .puz become available for solvers.
            To get a nicely formatted PDF for printing: click “More” and then
            “Print puzzle”. To download a .puz click “More” and then “Download
            .puz”
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
