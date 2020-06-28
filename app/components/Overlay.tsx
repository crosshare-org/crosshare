import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { IoMdCloseCircleOutline, } from 'react-icons/io';

import { HAS_PHYSICAL_KEYBOARD, KEYBOARD_HEIGHT } from '../lib/style';

export const Overlay = (props: { onClick?: () => void, hidden?: boolean, closeCallback?: () => void, showKeyboard?: boolean, children: React.ReactNode }) => {
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

  // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
  const overlay = <div onClick={props.onClick || (() => undefined)} css={{
    display: props.hidden ? 'none' : 'block',
    position: 'fixed',
    backgroundColor: 'var(--overlay-bg)',
    top: 0,
    left: 0,
    width: '100%',
    overflowY: 'scroll',
    overscrollBehavior: 'contain',
    height: props.showKeyboard ? 'calc(100% - ' + KEYBOARD_HEIGHT + 'px)' : '100%',
    [HAS_PHYSICAL_KEYBOARD]: {
      height: '100%',
    },
    zIndex: 10000
  }}>
    <div css={{
      position: 'relative',
      width: '90%',
      maxWidth: '650px',
      padding: '3em 1.5em',
      backgroundColor: 'var(--overlay-inner)',
      border: '1px solid black',
      margin: '5em auto',
    }}>
      {props.closeCallback ?
        <button css={{
          background: 'var(--overlay-inner)',
          color: 'var(--text)',
          border: 'none',
          position: 'absolute',
          padding: 0,
          fontSize: '3em',
          verticalAlign: 'text-top',
          width: '1em',
          height: '1em',
          top: 0,
          right: 0,
        }} onClick={props.closeCallback}><IoMdCloseCircleOutline css={{ position: 'absolute', top: 0, right: 0 }} /></button>
        :
        ''}
      {props.children}
    </div>
  </div>;

  return (mounted && ref.current) ? createPortal(overlay, ref.current) : overlay;
};
