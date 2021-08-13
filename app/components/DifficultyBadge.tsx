import { GlickoScoreT } from '../lib/dbtypes';
import { AuthContext } from './AuthContext';
import { useContext } from 'react';
import { gFunc, expectedOutcome } from '../lib/glickoUtil';

export const DifficultyBadge = (props: {
  puzzleRating: GlickoScoreT | null;
}) => {
  const { prefs } = useContext(AuthContext);

  let symbol = (
    <span
      css={{ color: 'var(--primary)' }}
      title="Unsure (not enough solves yet)"
    >
      ●
    </span>
  );

  const userRating = prefs?.rtg || { r: 1500, d: 350, u: 0 };

  if (props.puzzleRating && props.puzzleRating.d < 200) {
    const g = gFunc(
      Math.sqrt(
        props.puzzleRating.d * props.puzzleRating.d +
          userRating.d * userRating.d
      )
    );
    const expectation = expectedOutcome(g, userRating.r, props.puzzleRating.r);
    if (expectation < 0.25) {
      symbol = (
        <span css={{ color: 'var(--text)' }} title="Very Difficult">
          ◆◆
        </span>
      );
    } else if (expectation < 0.5) {
      symbol = (
        <span css={{ color: 'var(--text)' }} title="Difficult">
          ◆
        </span>
      );
    } else if (expectation < 0.8) {
      symbol = (
        <span css={{ color: 'var(--blue)' }} title="Medium">
          ■
        </span>
      );
    } else {
      symbol = (
        <span css={{ color: 'var(--green)' }} title="Easy">
          ●
        </span>
      );
    }
  }
  return symbol;
};
