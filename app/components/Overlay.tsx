import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { IoMdCloseCircleOutline } from 'react-icons/io';

import { SMALL_AND_UP } from '../lib/style';
import { CoverPic } from './Images';

export const Overlay = (props: {
  coverImage?: string | null;
  onClick?: () => void;
  hidden?: boolean;
  closeCallback?: () => void;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ref.current = document.getElementById('modal');
    if (!ref.current) {
      ref.current = document.createElement('div');
      ref.current.setAttribute('id', 'modal');
      document.body.appendChild(ref.current);
    }
    setMounted(true);
  }, []);

  const overlay = (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <div
      onClick={props.onClick ?? (() => undefined)}
      css={{
        display: props.hidden ? 'none' : 'block',
        position: 'fixed',
        backgroundColor: 'var(--overlay-bg)',
        top: 0,
        left: 0,
        width: '100%',
        overflowY: 'scroll',
        overscrollBehavior: 'contain',
        height: '100%',
        zIndex: 10000,
      }}
    >
      <div
        css={{
          position: 'relative',
          width: '95%',
          margin: '1em auto',
          [SMALL_AND_UP]: {
            width: '90%',
            margin: '2em auto',
          },
          maxWidth: '1200px',
          backgroundColor: 'var(--overlay-inner)',
          border: '1px solid black',
        }}
      >
        {props.coverImage ? <CoverPic coverPicture={props.coverImage} /> : ''}
        <div
          css={{
            padding: '3em 1.5em',
          }}
        >
          {props.closeCallback ? (
            <button
              css={{
                background: 'transparent',
                color: 'var(--text)',
                ...(props.coverImage && { color: 'var(--social-text)' }),
                border: 'none',
                position: 'absolute',
                padding: 0,
                fontSize: '2.5em',
                verticalAlign: 'text-top',
                width: '1em',
                height: '1em',
                top: '0.5em',
                right: '0.5em',
              }}
              onClick={props.closeCallback}
            >
              <IoMdCloseCircleOutline
                aria-label="close"
                css={{ position: 'absolute', top: 0, right: 0 }}
              />
            </button>
          ) : (
            ''
          )}
          {props.children}
        </div>
      </div>
    </div>
  );

  return mounted && ref.current ? createPortal(overlay, ref.current) : overlay;
};
