import * as React from 'react';

import Image from 'react-bootstrap/Image'
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Router, Link, RouteComponentProps } from "@reach/router";

import './App.css';
import logo from './crosshare.png';
import {PuzzleLoader} from './Puzzle';

const NotFound = (_: RouteComponentProps) => {
  return <div>Page not found :(</div>;
}

const Home = (_: RouteComponentProps) => {
  return <div>CROSSHARE is a not-for-profit community for crossword constructors and solvers.</div>;
}

const Construct = (_: RouteComponentProps) => {
  return <div>This would be the link to the crossword builder.</div>
}

const App = () => {
  return (
    <div className="app">
      <Navbar expand="sm" bg="primary">
        <Navbar.Brand as={Link} to="/">
          <Image fluid style={{height: "20px"}} src={logo} alt="logo"/> CROSSHARE
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/crosswords/presidential_appts">Puzzle</Nav.Link>
            <Nav.Link as={Link} to="/construct">New Puzzle</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <Router>
        <Home path="/" />
        <PuzzleLoader path="/crosswords/:crosswordId" />
        <Construct path="/construct" />
        <NotFound default />
      </Router>
    </div>
  );
}

export default App;
