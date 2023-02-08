import { forwardRef, SyntheticEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { DefaultTopBar } from '../components/TopBar';

const getViewportHeight = () => {
  if (typeof window !== 'undefined') {
    return window.visualViewport?.height || 0;
  }
  return 0;
};

const useViewportHeight = () => {
  const [state, setState] = useState(getViewportHeight);
  useEffect(() => {
    const handleResize = () => setState(getViewportHeight);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () =>
      window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);
  return state;
};

const useScrollLock = () => {
  useEffect(() => {
    const handleScroll = (e) => {e.preventDefault(); window.scrollTo(0, 0); return false;};
    window.addEventListener('scroll', handleScroll);
    return () =>
      window.removeEventListener('scroll', handleScroll);
  }, []);
};

interface BeforeInputEvent extends SyntheticEvent {
  data ?: string
}
const HiddenInput = forwardRef<HTMLInputElement, {handleKeyDown?: (e: KeyboardEvent) => void}>((props, ref) => {
  return <input autoCapitalize='characters' css={{
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
    position: 'absolute',
    zIndex: 99
  }}
  enterKeyHint={'next'}
  tabIndex={0}
  ref={ref}
  onKeyDown={props.handleKeyDown}
  />;
});

export default function SquareTestPage() {
  const [input, setInput] = useState('');

  const height = useViewportHeight();
  useScrollLock();

  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: height > 0 ? height : '100dvh',
          overflow: 'hidden',
        }}
      >
        <div css={{ flex: 'none' }}>
          <DefaultTopBar />
        </div>
        <div
          css={{ flex: '1 1 auto', overflow: 'scroll', position: 'relative' }}
        >
          <HiddenInput ref={inputRef} handleData={setInput}/>
          <div
            css={{
              color: 'red',
              background: 'blue',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '50%',
            }}
            onClick={() => {
              inputRef.current?.focus();
            }}
          >
            {input}
          </div>
        </div>
      </div>
    </>
  );
}
