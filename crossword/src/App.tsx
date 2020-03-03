import * as React from 'react';

import { Router, RouteComponentProps, Link } from "@reach/router";

import {PuzzleLoader} from './Puzzle';
// import {PuzzleBuilder} from './PuzzleBuilder';
import {Page, SquareTest} from './Page';

const NotFound = (_: RouteComponentProps) => {
  return <Page> not found :(</Page>;
}

const Home = (_: RouteComponentProps) => {
  return <Page>CROSSHARE is a not-for-profit community for crossword constructors. <Link to="/construct">Create a new crossword</Link></Page>;
}

const App = () => {
  return (
  <Router>
    <Home path="/" />
    <PuzzleLoader path="/crosswords/:crosswordId" />
    <SquareTest path="/square" />
    <NotFound default />
  </Router>
  );
}

export default App;
