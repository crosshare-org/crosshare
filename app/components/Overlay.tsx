import { IoMdCloseCircleOutline, } from 'react-icons/io';

import { KEYBOARD_HEIGHT } from '../lib/style'

export const Overlay = (props: { onClick?: () => void, hidden?: boolean, closeCallback?: () => void, showingKeyboard: boolean, children: React.ReactNode }) => {
  return (<div onClick={props.onClick || (() => undefined)} css={{
    display: props.hidden ? 'none' : 'block',
    position: 'fixed',
    backgroundColor: 'var(--overlay-bg)',
    top: 0,
    left: 0,
    width: '100%',
    overflowY: 'scroll',
    overscrollBehavior: 'contain',
    height: props.showingKeyboard ? 'calc(100% - ' + KEYBOARD_HEIGHT + 'px)' : '100%',
    zIndex: 10000
  }}>
    <div css={{
      position: 'relative',
      width: '90%',
      maxWidth: '650px',
      padding: '3em 1.5em',
      backgroundColor: 'var(--overlay-inner)',
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
  </div>);
};
