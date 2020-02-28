/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { Link, RouteComponentProps } from "@reach/router";

import logo from './crosshare.png';
import {PRIMARY, HEADER_HEIGHT} from './style'

interface TopBarProps extends RouteComponentProps {
  children?: React.ReactNode
}

export const TopBarLink = (props: {text: string, icon: React.ReactNode, onClick: () => void}) => {
  return (
    <a title={props.text} css={{
      color: 'black',
      '&:hover': {
        color: 'black',
        textDecoration: 'none',
      }
    }} href="#" onClick={props.onClick}>
    <span css={{
      verticalAlign: 'middle',
      fontSize: HEADER_HEIGHT - 10,
    }}>{props.icon}</span>
    <span css={{
      marginLeft: '5px',
      verticalAlign: 'middle',
      display: 'none',
      fontSize: HEADER_HEIGHT - 20,
      '@media (min-width: 576px)': {
        display: 'inline-block',
      }
    }}>{props.text}</span>
    </a>
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
      '@media (min-width: 576px)': {
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
