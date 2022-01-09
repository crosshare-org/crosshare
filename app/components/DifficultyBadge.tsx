import { GlickoScoreT } from '../lib/dbtypes';
import { AuthContext } from './AuthContext';
import { useContext, useState } from 'react';
import { twoPlayerExpectation } from '../lib/glickoUtil';
import { Overlay } from './Overlay';
import { GoogleButton } from './GoogleButtons';
import { Link } from './Link';

export const DifficultyBadge = (props: {
  puzzleRating: GlickoScoreT | null;
}) => {
  const [showingExplainer, setShowingExplainer] = useState(false);
  const { user, prefs } = useContext(AuthContext);

  let symbol = (
    <span
      css={{ color: 'var(--primary)' }}
      title="Unsure (not enough solves yet)"
    >
      ●
    </span>
  );
  let text = 'unknown';

  const userRating = prefs?.rtg || { r: 1500, d: 350, u: 0 };

  if (props.puzzleRating && props.puzzleRating.d < 200) {
    const expectation = twoPlayerExpectation(userRating, props.puzzleRating);
    if (expectation < 0.25) {
      symbol = (
        <span
          css={{ color: 'var(--text)' }}
          title={`Very Difficult (${Math.round(props.puzzleRating.r)})`}
        >
          ◆◆
        </span>
      );
      text = 'very difficult';
    } else if (expectation < 0.5) {
      symbol = (
        <span
          css={{ color: 'var(--text)' }}
          title={`Difficult (${Math.round(props.puzzleRating.r)})`}
        >
          ◆
        </span>
      );
      text = 'difficult';
    } else if (expectation < 0.8) {
      symbol = (
        <span
          css={{ color: 'var(--blue)' }}
          title={`Medium (${Math.round(props.puzzleRating.r)})`}
        >
          ■
        </span>
      );
      text = 'medium difficulty';
    } else {
      symbol = (
        <span
          css={{ color: 'var(--green)' }}
          title={`Easy (${Math.round(props.puzzleRating.r)})`}
        >
          ●
        </span>
      );
      text = 'easy';
    }
  }
  return (
    <>
      <span
        onClick={() => setShowingExplainer(true)}
        onKeyPress={() => setShowingExplainer(true)}
        role={'button'}
        tabIndex={-1}
        css={{ cursor: 'pointer' }}
      >
        {symbol}
      </span>
      {showingExplainer ? (
        <Overlay closeCallback={() => setShowingExplainer(false)}>
          {props.puzzleRating && props.puzzleRating.d < 200 ? (
            <>
              <p>
                This puzzle&apos;s rating is{' '}
                <strong>{Math.round(props.puzzleRating.r)}</strong>.{' '}
                {user && user.email ? (
                  <>
                    Based on your prior solves we predict it will be{' '}
                    <strong>{text}</strong> for you to solve without
                    check/reveal.
                  </>
                ) : (
                  <>
                    We predict it will be <strong>{text}</strong> to solve for
                    the average Crosshare solver.
                  </>
                )}
              </p>
              {user && user.email ? (
                <p>
                  The difficulty symbols shown are specific to you based on your
                  solve history. As you solve more puzzles Crosshare will be
                  able to more accurately predict difficulties for you.
                </p>
              ) : (
                <p>
                  If you{' '}
                  <GoogleButton user={user} text={'sign in (via Google)'} />{' '}
                  Crosshare will use your solve history to display difficulty
                  ratings for you specifically!
                </p>
              )}
            </>
          ) : (
            <p>
              This puzzle has not had enough solves yet to have a difficulty
              rating. Ratings are updated once per day.
            </p>
          )}
          <p>
            See our{' '}
            <Link href="/articles/crossword-difficulty-ratings">
              article about Crosshare difficulty ratings
            </Link>{' '}
            for more info on how this works.
          </p>
        </Overlay>
      ) : (
        ''
      )}
    </>
  );
};
