import * as React from 'react';
import axios from 'axios';
import {RouteComponentProps} from '@reach/router';
import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import Row from 'react-bootstrap/Row';

import {Grid, Entry, GridData} from './Grid';
import {Position, Direction, BLOCK, PuzzleJson} from './types';
import {TopBar} from './TopBar';
import {Page} from './Page';

interface PuzzleProps extends RouteComponentProps {
  crosswordId?: string
}

export const PuzzleLoader = ({crosswordId}: PuzzleProps) => {
  const [puzzle, setPuzzle] = React.useState<PuzzleJson|null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await axios(
          `${process.env.PUBLIC_URL}/demos/${crosswordId}.xw`
        );
        setPuzzle(result.data);
      } catch (error) {
        setIsError(true);
      }
      setIsLoaded(true);
    };
    fetchData();
  }, [crosswordId]);

  if (isError) {
    return <Page>Something went wrong while loading puzzle '{crosswordId}'</Page>;
  }
  if (!isLoaded || !puzzle) {
    return <Page>Loading '{crosswordId}'...</Page>
  }
  return <Puzzle {...puzzle} />
}

export const Puzzle = (props: PuzzleJson) => {
  const answers = props.grid;
  const [active, setActive] = React.useState({col: 0, row: 0} as Position);
  const [direction, setDirection] = React.useState(Direction.Across);
  const [input, setInput] = React.useState(answers.map((s) => s === BLOCK ? BLOCK : " ") as Array<string>);

  const grid = GridData.fromCells(props.size.cols, props.size.rows, input);

  let clues = new Array<string>(grid.entries.length);
  function setClues(jsonClueList: Array<string>, direction: Direction) {
    for (let clue of jsonClueList) {
      let match = clue.match(/^(\d+)\. (.+)$/);
      if (!match || match.length < 3) {
        throw new Error("Bad clue data: '" + clue + "'");
      }
      const number = +match[1];
      const clueText = match[2];

      for (let entry of grid.entries) {
        if (entry.direction === direction && entry.labelNumber === number) {
          clues[entry.index] = clueText;
        }
      }
    }
  }
  setClues(props.clues.across, Direction.Across);
  setClues(props.clues.down, Direction.Down);

  const [entry, cross] = grid.entryAndCrossAtPosition(active, direction);
  const clue = clues[entry.index];

  function filt(direction: Direction) {
    return (_a:any, index: number) => {
      return grid.entries[index].direction === direction;
    }
  }
  const refs = React.useRef(new Array<React.RefObject<any>>(grid.entries.length));
  for (let i = 0; i < refs.current.length; i += 1) {
    if (!refs.current[i]) {
      refs.current[i] = React.createRef();
    }
  }
  function scrollClueIntoView(e: Entry) {
    const currentEntryClue = refs.current[e.index].current;
    if (currentEntryClue) {
      console.log("scrolling to " + e.index);
      currentEntryClue.scrollIntoView({
        behavior: 'auto',
        block: 'center',
      });
    }
  }
  scrollClueIntoView(cross);
  scrollClueIntoView(entry);

  const listItems = clues.map((clue, idx) => {
    function click(e: React.MouseEvent) {
      e.preventDefault();
      const clickedEntry = grid.entries[idx];
      setDirection(clickedEntry.direction);
      setActive(clickedEntry.cells[0]);
      for (let cell of clickedEntry.cells) {
        if (grid.valAt(cell) === " ") {
          setActive(cell);
          break
        }
      }
    }
    const number = grid.entries[idx].labelNumber;
    if (entry.index === idx) {
      return <ListGroup.Item className="clue-list-entry" ref={refs.current[idx]} variant="primary" key={idx}>{number}. {clue}</ListGroup.Item>
    }
    if (cross.index === idx) {
      return (
        <ListGroup.Item className="clue-list-entry" ref={refs.current[idx]} action onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={click} variant="secondary" key={idx}>
          {number}. {clue}
        </ListGroup.Item>
      );
    }
    return (
      <ListGroup.Item className="clue-list-entry" ref={refs.current[idx]} action onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={click} key={idx}>
        {number}. {clue}
      </ListGroup.Item>
    );
  });
  const acrossClues = listItems.filter(filt(Direction.Across));
  const downClues = listItems.filter(filt(Direction.Down));

  return (
    <React.Fragment>
    <TopBar/>
    <Container className="puzzle" fluid>
      <Row>
      <Col xs={12} sm={8} lg={6}>
        <Grid
          grid={grid} setCellValues={setInput}
          active={active} setActive={setActive}
          direction={direction} setDirection={setDirection}
        />
        <div className="current-clue"><span className="clue-label">{ entry.labelNumber }{ entry.direction === Direction.Across ? "A" : "D"}</span>{ clue }</div>
      </Col>
      <Col xs={12} sm={4} lg={6}>
        <Row>
          <Col xs={12} lg={6}>
            <h5 className="clue-list-header">Across</h5>
            <ListGroup className="clue-list list-group-flush">{acrossClues}</ListGroup>
          </Col>
          <Col xs={12} lg={6}>
            <h5 className="clue-list-header">Down</h5>
            <ListGroup className="clue-list list-group-flush">{downClues}</ListGroup>
          </Col>
        </Row>
      </Col>
      </Row>
    </Container>
    </React.Fragment>
  )
}
