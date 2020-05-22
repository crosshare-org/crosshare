/** @jsx jsx */
import { jsx } from '@emotion/react';
import * as React from 'react';
import Link from 'next/link';

import { isMobile, isIPad13 } from "react-device-detect";

import { Overlay } from './Overlay';
import { Logo } from './Icons';
import { PRIMARY, HEADER_HEIGHT, SMALL_AND_UP } from '../helpers/style';

export const TopBarDropDown = (props: { text: string, icon: React.ReactNode, children: React.ReactNode }) => {
  const [dropped, setDropped] = React.useState(false);
  return (
    <React.Fragment>
      <TopBarLink onClick={() => setDropped(!dropped)} text={props.text} icon={props.icon} />
      <Overlay onClick={() => setDropped(false)} showingKeyboard={false} closeCallback={() => setDropped(false)} hidden={!dropped}>
        {props.children}
      </Overlay>
    </React.Fragment>
  );
}

export const TopBarDropDownLink = (props: { shortcutHint?: React.ReactNode, text: string, icon: React.ReactNode, onClick: () => void }) => {
  return (
    <button title={props.text} css={{
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
      }}>{props.text}{!isMobile && !isIPad13 && props.shortcutHint ? <span> ( <span css={{ fontSize: HEADER_HEIGHT - 10 }}>{props.shortcutHint}</span> )</span> : ""}</div>
    </button>
  );
}

interface TopBarLinkProps extends React.HTMLProps<HTMLButtonElement> {
  text?: string,
  hoverText?: string,
  keepText?: boolean,
  icon: React.ReactNode,
  onClick?: () => void
}

export const TopBarLink = React.forwardRef<HTMLButtonElement, TopBarLinkProps>((props, ref) => {
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
        : ""}
    </button>
  );
});

interface TopBarProps {
  children?: React.ReactNode
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
        <React.Fragment>
          {children}
        </React.Fragment>
      </div>
    </header>
  );
}
