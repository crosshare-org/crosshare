import { Dispatch, useEffect, useRef } from 'react';
import { PuzzleAction } from '../reducers/reducer';
import { Overlay } from './Overlay';
import { ButtonResetCSS } from './Buttons';
import { SlateHeader, SlateLogo } from './SlateHeader';
import { Illustration, Pause, Play } from './SlateIcons';
import { Link } from './Link';
import { css } from '@emotion/react';
import { LARGE_AND_UP, SMALL_AND_UP } from '../lib/style';
import { SlateColorTheme } from './SlateColorTheme';
import { PuzzleResultWithAugmentedComments } from '../lib/types';
import {
  SLATE_PADDING_SMALL,
  SLATE_PADDING_MED,
  SLATE_PADDING_LARGE,
} from './Page';
import { FullscreenCSS } from './FullscreenCSS';

const PoweredByLink = () => {
  return (
    <Link
      css={{
        '&:hover': { color: 'var(--slate-subtitle)' },
        color: 'var(--slate-subtitle)',
        letterSpacing: '1.36px',
        fontSize: '0.9rem',
        textTransform: 'uppercase',
      }}
      href="/"
    >
      Powered by crosshare.org
    </Link>
  );
};

const SlateOverlayHeader = () => {
  return (
    <>
      <SlateLogo css={{ marginBottom: '1rem' }} />
      <div
        css={{
          textAlign: 'center',
          marginBottom: '2rem',
        }}
      >
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
      <Pause
        css={{
          opacity: '0.3',
          display: 'block',
          margin: 'auto',
          fontSize: '4rem',
        }}
      />
      <div
        css={{
          fontSize: '1.383rem',
          textAlign: 'center',
          fontWeight: 'bold',
          margin: '2rem 0 2.82rem 0',
          color: 'var(--slate-title)',
        }}
      >
        Your puzzle is paused
      </div>

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
      <div
        ref={containerRef}
        css={{
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--slate-container-border)',
          borderRadius: '4px',
          overflow: 'hidden',
          padding: `${SLATE_PADDING_SMALL}px 0 0 0`,
          [SMALL_AND_UP]: {
            padding: `${SLATE_PADDING_MED}px 0 0 0`,
          },
          [LARGE_AND_UP]: {
            padding: `${SLATE_PADDING_LARGE}px 0 0 0`,
          },
          color: 'var(--slate-subtitle)',
          textAlign: 'center',
        }}
      >
        <SlateHeader
          title={puzzle.title}
          author={puzzle.guestConstructor || puzzle.authorName}
          publishTime={puzzle.isPrivateUntil ?? puzzle.publishTime}
          note={puzzle.constructorNotes}
        />
        <Illustration
          css={{
            color: 'var(--slate-button-text)',
            fontSize: '10rem',
            opacity: '0.3',
          }}
        />
        <div
          css={{
            textAlign: 'center',
            margin: '2rem 0',
          }}
        >
          <PoweredByLink />
        </div>
        {loadingPlayState ? (
          <div css={{ height: '85px' }} />
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
  radius: number;
}) => {
  return (
    <button
      css={css([
        ButtonResetCSS,
        {
          backgroundColor: 'var(--primary)',
          width: '100%',
          color: 'white',
          height: '85px',
          borderRadius: `${radius}px ${radius}px 0 0`,
          '&:hover': {
            backgroundColor: 'var(--slate-primary-hover)',
          },
        },
      ])}
      onClick={() => {
        window.parent.postMessage({ type: 'resume' }, '*');
        dispatch({ type: 'RESUMEACTION' });
      }}
    >
      <Play css={{ fontSize: '35px', marginRight: '1rem' }} />
      <span
        css={{
          fontSize: '1.383rem',
          fontWeight: 'bold',
          verticalAlign: 'middle',
        }}
      >
        {text}
      </span>
    </button>
  );
};
