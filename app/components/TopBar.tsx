import { ReactNode, useState, HTMLProps, forwardRef } from 'react';
import Link from 'next/link';

import { Overlay } from './Overlay';
import { Logo } from './Icons';
import { PRIMARY, HEADER_HEIGHT, SMALL_AND_UP, HAS_PHYSICAL_KEYBOARD } from '../lib/style';

export const TopBarDropDown = (props: { text: string, icon: ReactNode, children: ReactNode }) => {
  const [dropped, setDropped] = useState(false);
  return (
    <>
      <TopBarLink onClick={() => setDropped(!dropped)} text={props.text} icon={props.icon} />
      <Overlay onClick={() => setDropped(false)} closeCallback={() => setDropped(false)} hidden={!dropped}>
        {props.children}
      </Overlay>
    </>
  );
};

interface TopBarDropDownLinkProps { shortcutHint?: ReactNode, text: string, icon: ReactNode, onClick?: () => void }
export const TopBarDropDownLink = forwardRef<HTMLButtonElement, TopBarDropDownLinkProps>((props, ref) => {
  return (
    <button ref={ref} title={props.text} css={{
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline',
      margin: 0,
      padding: '0.5em',
      width: '100%',
      color: 'var(--text)',
      '&:hover, &:focus': {
        textDecoration: 'none',
        backgroundColor: 'var(--top-bar-hover)',
      },
    }} onClick={props.onClick}>
      <div css={{
        verticalAlign: 'baseline',
        fontSize: HEADER_HEIGHT - 10,
        display: 'inline-block',
        width: '35%',
        textAlign: 'right',
        marginRight: '5%',
      }}>{props.icon}</div>
      <div css={{
        verticalAlign: 'baseline',
        fontSize: HEADER_HEIGHT - 20,
        display: 'inline-block',
        width: '60%',
        textAlign: 'left',
      }}>{props.text}{props.shortcutHint ? <span css={{ display: 'none', [HAS_PHYSICAL_KEYBOARD]: { display: 'inline' } }}> ( <span css={{ fontSize: HEADER_HEIGHT - 10 }}>{props.shortcutHint}</span> )</span> : ''}</div>
    </button>
  );
});

interface TopBarLinkProps extends HTMLProps<HTMLButtonElement> {
  text?: string,
  hoverText?: string,
  keepText?: boolean,
  icon: ReactNode,
  onClick?: () => void
}

export const TopBarLink = forwardRef<HTMLButtonElement, TopBarLinkProps>((props, ref) => {
  return (
    <button ref={ref} title={props.hoverText || props.text} css={{
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline',
      margin: 0,
      padding: '0 0.45em',
      color: 'var(--text)',
      '&:hover, &:focus': {
        textDecoration: 'none',
        backgroundColor: 'var(--top-bar-hover)',
      },
    }} onClick={props.onClick}>
      <span css={{
        verticalAlign: 'baseline',
        fontSize: HEADER_HEIGHT - 10,
      }}>{props.icon}</span>
      {props.text ?
        <span css={{
          marginLeft: '5px',
          verticalAlign: 'middle',
          display: props.keepText ? 'inline-block' : 'none',
          fontSize: HEADER_HEIGHT - 20,
          [SMALL_AND_UP]: {
            display: 'inline-block',
          }
        }}>{props.text}</span>
        : ''}
    </button>
  );
});

interface TopBarProps {
  children?: ReactNode
}

export const TopBar = ({ children }: TopBarProps) => {
  return (
    <header css={{
      height: HEADER_HEIGHT,
      backgroundColor: PRIMARY,
    }}>
      <div css={{
        padding: '0 10px',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        lineHeight: (HEADER_HEIGHT - 4) + 'px',
      }}>
        <Link href="/" passHref>
          <a css={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none !important',
            cursor: 'pointer',
          }} title="Crosshare Home">
            <Logo width={HEADER_HEIGHT - 4} height={HEADER_HEIGHT - 4} />
            <span css={{
              marginLeft: '5px',
              display: 'none',
              color: 'var(--text)',
              fontSize: HEADER_HEIGHT - 10,
              [SMALL_AND_UP]: {
                display: 'inline-block',
              }
            }}>CROSSHARE</span>
          </a>
        </Link>
        <>
          {children}
        </>
      </div>
    </header>
  );
};
