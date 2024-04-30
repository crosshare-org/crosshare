import { Dispatch, useEffect, useRef } from 'react';
import { PuzzleResultWithAugmentedComments } from '../lib/types';
import { PuzzleAction } from '../reducers/commonActions';
import { ButtonReset } from './Buttons';
import { FullscreenCSS } from './FullscreenCSS';
import { Link } from './Link';
import { Overlay } from './Overlay';
import { SlateColorTheme } from './SlateColorTheme';
import { SlateHeader, SlateLogo } from './SlateHeader';
import { Illustration, Pause, Play } from './SlateIcons';
import styles from './SlateOverlays.module.css';

const PoweredByLink = () => {
  return (
    <Link className={styles.poweredBy} href="/">
      Powered by crosshare.org
    </Link>
  );
};

const SlateOverlayHeader = () => {
  return (
    <>
      <SlateLogo className={styles.logo} />
      <div className={styles.poweredByWrap}>
        <PoweredByLink />
      </div>
    </>
  );
};

export const SlatePause = ({
  dispatch,
}: {
  dispatch: Dispatch<PuzzleAction>;
}) => {
  return (
    <Overlay innerPadding="3em 0 0 0">
      <SlateOverlayHeader />
      <Pause className={styles.pauseIcon} />
      <div className={styles.pauseText}>Your puzzle is paused</div>

      <BigButton text={'Resume'} dispatch={dispatch} radius={7} />
    </Overlay>
  );
};

export const SlateBegin = ({
  puzzle,
  loadingPlayState,
  dispatch,
}: {
  puzzle: PuzzleResultWithAugmentedComments;
  loadingPlayState: boolean;
  dispatch: Dispatch<PuzzleAction>;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      window.parent.postMessage(
        {
          type: 'load',
          scrollHeight: containerRef.current.scrollHeight,
        },
        '*'
      );
    }
  });
  return (
    <>
      <FullscreenCSS />
      <SlateColorTheme />
      <div ref={containerRef} className={styles.beginContainer}>
        <SlateHeader
          title={puzzle.title}
          author={puzzle.guestConstructor || puzzle.authorName}
          note={puzzle.constructorNotes}
        />
        <Illustration className={styles.illustration} />
        <div className={styles.poweredByWrap2}>
          <PoweredByLink />
        </div>
        {loadingPlayState ? (
          <div className={styles.buttonPlaceholder} />
        ) : (
          <BigButton dispatch={dispatch} text={'Begin Puzzle'} radius={4} />
        )}
      </div>
    </>
  );
};

const BigButton = ({
  dispatch,
  text,
  radius,
}: {
  dispatch: Dispatch<PuzzleAction>;
  text: string;
  radius: 4 | 7;
}) => {
  return (
    <ButtonReset
      data-radius={radius.toString()}
      className={styles.bigButton}
      onClick={() => {
        window.parent.postMessage({ type: 'resume' }, '*');
        dispatch({ type: 'RESUMEACTION' });
      }}
    >
      <Play className={styles.playIcon} />
      <span className={styles.buttonText}>{text}</span>
    </ButtonReset>
  );
};
