/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { Link, RouteComponentProps } from "@reach/router";

import { Overlay } from './Overlay';
import logo from './crosshare.png';
import {PRIMARY, HEADER_HEIGHT, SMALL_AND_UP} from './style'

export const TopBarDropDown = (props: {text: string, icon: React.ReactNode, children: React.ReactNode}) => {
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

export const TopBarDropDownLink = (props: {text: string, icon: React.ReactNode, onClick: () => void}) => {
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
      color: 'black',
      '&:hover, &:focus': {
        color: 'black',
        textDecoration: 'none',
        backgroundColor: 'rgba(0,0,0,0.1)',
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
    }}>{props.text}</div>
    </button>
  );
}

export const TopBarLink = (props: {text: string, hoverText?: string, keepText?: boolean, icon: React.ReactNode, onClick: () => void}) => {
  return (
    <button title={props.hoverText || props.text} css={{
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline',
      margin: 0,
      padding: '0 0.45em',
      color: 'black',
      '&:hover, &:focus': {
        color: 'black',
        textDecoration: 'none',
        backgroundColor: 'rgba(0,0,0,0.1)',
      },
    }} onClick={props.onClick}>
    <span css={{
      verticalAlign: 'baseline',
      fontSize: HEADER_HEIGHT - 10,
    }}>{props.icon}</span>
    <span css={{
      marginLeft: '5px',
      verticalAlign: 'middle',
      display: props.keepText ? 'inline-block' : 'none',
      fontSize: HEADER_HEIGHT - 20,
      [SMALL_AND_UP]: {
        display: 'inline-block',
      }
    }}>{props.text}</span>
    </button>
  );
}

interface TopBarProps extends RouteComponentProps {
  children?: React.ReactNode
}

export const TopBar = ({children}: TopBarProps) => {
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
    <Link css={{
      flexGrow: 1,
    }} to="/" title="crosshare home">
    <img src={logo} height={HEADER_HEIGHT - 4} width={HEADER_HEIGHT - 4} alt="Logo" css={{
      display: 'inline-block',
      verticalAlign: 'middle',
    }}/>
    <span css={{
      marginLeft: '5px',
      verticalAlign: 'middle',
      display: 'none',
      color: 'black',
      fontSize: HEADER_HEIGHT - 10,
      [SMALL_AND_UP]: {
        display: 'inline-block',
      }
    }}>CROSSHARE</span>
    </Link>
    <React.Fragment>
    {children}
    </React.Fragment>
    </div>
    </header>);
    /*<Navbar expand="sm" bg="primary">
    <Navbar.Brand as={Link} to="/">
      <Image height={22} src={logo} alt=""/> CROSSHARE
    </Navbar.Brand>
    { children ?
      <Nav>
      {children}
      </Nav> : " " }
    <Navbar.Toggle aria-controls="basic-navbar-nav" />
    <Navbar.Collapse id="basic-navbar-nav">
      <Nav className="mr-auto">
        <Nav.Link as={Link} to="/">Home</Nav.Link>
        <Nav.Link as={Link} to="/crosswords/presidential_appts">Puzzle</Nav.Link>
        <Nav.Link as={Link} to="/construct">New Puzzle</Nav.Link>
      </Nav>
    </Navbar.Collapse>
  </Navbar>
  </header>);*/
}
