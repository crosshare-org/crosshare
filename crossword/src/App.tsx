import * as React from 'react';

import axios from 'axios';
import Image from 'react-bootstrap/Image'
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

import './App.css';
import logo from './crosshare.png';
import {PuzzleJson} from './types';
import {Puzzle} from './Puzzle';

const App = () => {
  const [puzzle, setPuzzle] = React.useState<PuzzleJson|null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await axios(
          process.env.PUBLIC_URL + '/demos/presidential_appts.xw',
        );
        setPuzzle(result.data);
      } catch (error) {
        setIsError(true);
      }
      setIsLoaded(true);
    };
    fetchData();
  }, []);

  return (
    <React.Fragment>
    <Navbar expand="sm" bg="primary">
      <Navbar.Brand href="#home">
      <Image fluid style={{height: "20px"}} src={logo} alt="logo"/> CROSSHARE
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="mr-auto">
          <Nav.Link href="#home">Home</Nav.Link>
          <Nav.Link href="#link">Link</Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
    {isError && <div>Something went wrong ...</div>}
    {isLoaded && puzzle ? (
      <div className="app">
        <Puzzle {...puzzle}/>
      </div>
    ) : (
      <div>Loading...</div>
    )}
    </React.Fragment>
  );
}

export default App;
