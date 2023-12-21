import { Dispatch } from 'react';
import { PuzzleAction } from '../reducers/reducer';
import { Overlay } from './Overlay';
import { ButtonResetCSS } from './Buttons';
import { SlateLogo } from './SlateHeader';
import { Pause, Play } from './SlateIcons';
import { Link } from './Link';

export const SlateSuccess = () => {
  return <Overlay>Success</Overlay>;
};

export const SlatePause = ({
  dispatch,
}: {
  dispatch: Dispatch<PuzzleAction>;
}) => {
  return (
    <Overlay>
      <SlateLogo css={{ marginBottom: '1rem' }} />
      <div
        css={{
          textAlign: 'center',
          textTransform: 'uppercase',
          marginBottom: '2rem',
        }}
      >
        <Link
          css={{
            '&:hover': { color: 'var(--slate-title)', textDecoration: 'none' },
            opacity: '0.3',
            color: 'var(--slate-title)',
          }}
          href="/"
        >
          Powered by crosshare.org
        </Link>
      </div>
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

      <button
        css={[
          ButtonResetCSS,
          {
            backgroundColor: 'var(--primary)',
            width: '100%',
            color: 'white',
            height: '85px',
            borderRadius: '7px',
            '&:hover': {
              filter: 'var(--slate-hover-filter)',
            },
          },
        ]}
        onClick={() => {
          window.parent.postMessage({ type: 'resume' }, '*');
          dispatch({ type: 'RESUMEACTION' });
        }}
      >
        <Play css={{ fontSize: '35px', marginRight: '1rem' }} />
        <span css={{ fontSize: '1.383rem', fontWeight: 'bold' }}>Resume</span>
      </button>
    </Overlay>
  );
};
