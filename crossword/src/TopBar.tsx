/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { Link, RouteComponentProps } from "@reach/router";

import logo from './crosshare.png';
import {PRIMARY, HEADER_HEIGHT, SMALL_AND_UP} from './style'

interface TopBarProps extends RouteComponentProps {
  children?: React.ReactNode
}

export const TopBarLink = (props: {text: string, icon: React.ReactNode, onClick: () => void}) => {
  return (
    <button title={props.text} css={{
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline',
      margin: 0,
      padding: 0,
      color: 'black',
      '&:hover': {
        color: 'black',
        textDecoration: 'none',
      },
      '&:focus': {
        color: 'black',
        textDecoration: 'none',
      },
    }} onClick={props.onClick}>
    <span css={{
      verticalAlign: 'middle',
      fontSize: HEADER_HEIGHT - 10,
    }}>{props.icon}</span>
    <span css={{
      marginLeft: '5px',
      verticalAlign: 'middle',
      display: 'none',
      fontSize: HEADER_HEIGHT - 20,
      [SMALL_AND_UP]: {
        display: 'inline-block',
      }
    }}>{props.text}</span>
    </button>
  );
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
      justifyContent: 'space-between',
    }}>
    <Link to="/" title="crosshare home">
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
