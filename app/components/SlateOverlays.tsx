import useEventListener from '@use-it/event-listener';
import { Dispatch, useCallback, useEffect, useRef } from 'react';
import { PuzzleResultWithAugmentedComments } from '../lib/types.js';
import { PuzzleAction } from '../reducers/commonActions.js';
import { ButtonReset } from './Buttons.js';
import { FullscreenCSS } from './FullscreenCSS.js';
import { Link } from './Link.js';
import { Overlay } from './Overlay.js';
import { SlateColorTheme } from './SlateColorTheme.js';
import { SlateHeader, SlateLogo } from './SlateHeader.js';
import { Illustration, Pause, Play } from './SlateIcons.js';
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

interface Message {
  type: string;
}

export const SlatePause = ({
  dispatch,
}: {
  dispatch: Dispatch<PuzzleAction>;
}) => {
  useEffect(() => {
    window.parent.postMessage(
      {
        type: 'ready',
        inProgress: true,
      },
      '*'
    );
  }, []);

  // TODO share this w/ Begin overlay below
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const message: Message = e.data;

      if (message.type === 'start') {
        window.parent.postMessage({ type: 'resume' }, '*');
        dispatch({ type: 'RESUMEACTION' });
      }
    },
    [dispatch]
  );
  useEventListener('message', handleMessage);

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
  useEffect(() => {
    if (containerRef.current && !loadingPlayState) {
      window.parent.postMessage(
        {
          type: 'ready',
          inProgress: false,
        },
        '*'
      );
    }
  }, [loadingPlayState]);

  // TODO share this w/ Pause overlay above
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const message: Message = e.data;

      if (message.type === 'start') {
        window.parent.postMessage({ type: 'resume' }, '*');
        dispatch({ type: 'RESUMEACTION' });
      }
    },
    [dispatch]
  );
  useEventListener('message', handleMessage);

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
