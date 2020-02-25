import * as React from 'react';

import { Router, RouteComponentProps } from "@reach/router";

import './App.css';
import {PuzzleLoader} from './Puzzle';
import {PuzzleBuilder} from './PuzzleBuilder';
import {Page} from './Page';

const NotFound = (_: RouteComponentProps) => {
  return <Page> not found :(</Page>;
}

const Home = (_: RouteComponentProps) => {
  return <Page>CROSSHARE is a not-for-profit community for crossword constructors.</Page>;
}

const App = () => {
  return (
    <div className="app">
      <Router>
        <Home path="/" />
        <PuzzleLoader path="/crosswords/:crosswordId" />
        <PuzzleBuilder path="/construct" />
        <NotFound default />
      </Router>
    </div>
  );
}

export default App;
