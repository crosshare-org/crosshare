import * as React from 'react';
import { Link, RouteComponentProps } from "@reach/router";

import Image from 'react-bootstrap/Image'
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

import logo from './crosshare.png';

export const TopBar = (_: RouteComponentProps) => {
  return (<Navbar expand="sm" bg="primary">
    <Navbar.Brand as={Link} to="/">
      <Image height={30} src={logo} alt=""/> CROSSHARE
    </Navbar.Brand>
    <Navbar.Toggle aria-controls="basic-navbar-nav" />
    <Navbar.Collapse id="basic-navbar-nav">
      <Nav className="mr-auto">
        <Nav.Link as={Link} to="/">Home</Nav.Link>
        <Nav.Link as={Link} to="/crosswords/presidential_appts">Puzzle</Nav.Link>
        <Nav.Link as={Link} to="/construct">New Puzzle</Nav.Link>
      </Nav>
    </Navbar.Collapse>
  </Navbar>);
}
