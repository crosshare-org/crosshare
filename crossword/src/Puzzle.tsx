/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import axios from 'axios';
import { RouteComponentProps } from '@reach/router';
import { isMobile } from "react-device-detect";
import { FaKeyboard } from 'react-icons/fa';

import { Grid, Entry, GridData } from './Grid';
import { Position, Direction, BLOCK, PuzzleJson } from './types';
import { TopBar, TopBarLink } from './TopBar';
import { Page, SquareAndCols } from './Page';
import { SECONDARY, LIGHTER, SMALL_AND_UP } from './style'

interface PuzzleProps extends RouteComponentProps {
  crosswordId?: string
}

export const PuzzleLoader = ({ crosswordId }: PuzzleProps) => {
  const [puzzle, setPuzzle] = React.useState<PuzzleJson | null>(null);
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

interface ClueListProps {
  header?: string,
  clues: Array<JSX.Element>,
}
function ClueList(props: ClueListProps) {
  return (
    <div css={{
      height: "100% !important",
      position: 'relative',
    }}>{props.header ?
      <div css={{
        fontWeight: 'bold',
        borderBottom: '1px solid #AAA',
        height: '1.5em',
        paddingLeft: '0.5em',
      }}>{props.header}</div> : ""}
      <div css={{
        maxHeight: props.header ? 'calc(100% - 1.5em)' : '100%',
        overflowY: 'scroll',
      }}>
        <ol css={{
          margin: 0,
          padding: 0,
        }}>
          {props.clues}
        </ol>
      </div>
    </div>
  );

}

export const Puzzle = (props: PuzzleJson) => {
  const answers = props.grid;
  const [active, setActive] = React.useState({ col: 0, row: 0 } as Position);
  const [direction, setDirection] = React.useState(Direction.Across);
  const [input, setInput] = React.useState(answers.map((s) => s === BLOCK ? BLOCK : " ") as Array<string>);
  const [showKeyboard, setShowKeyboard] = React.useState(isMobile);
  const toggleKeyboard = () => setShowKeyboard(!showKeyboard);

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

  function filt(direction: Direction) {
    return (_a: any, index: number) => {
      return grid.entries[index].direction === direction;
    }
  }
  const refs = React.useRef(new Array<Array<HTMLLIElement>>(grid.entries.length));
  for (let i = 0; i < refs.current.length; i += 1) {
    if (!refs.current[i]) {
      refs.current[i] = new Array();
    }
  }
  function scrollClueIntoView(e: Entry) {
    for (const currentEntryClue of refs.current[e.index]) {
      if (currentEntryClue) {
        currentEntryClue.scrollIntoView({
          behavior: 'auto',
          block: 'center',
        });
      }
    }
  }
  scrollClueIntoView(cross);
  scrollClueIntoView(entry);

  const listItems = clues.map((clue, idx) => {
    function click(e: React.MouseEvent) {
      e.preventDefault();
      if (entry.index === idx) {
        return;
      }
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

    function refCallback(item:HTMLLIElement) {
      if (!item) {
        refs.current[idx] = new Array<HTMLLIElement>();
      } else {
        refs.current[idx].push(item);
      }
    }

    const number = grid.entries[idx].labelNumber;
    return (
      <li css={{
        padding: '0.5em',
        backgroundColor: (idx === entry.index ? LIGHTER : (idx === cross.index ? SECONDARY : 'white')),
        listStyleType: 'none',
        cursor: (idx === entry.index ? 'default' : 'pointer'),
        '&:hover': {
          backgroundColor: (idx === entry.index ? LIGHTER : (idx === cross.index ? '#DDD' : '#EEE')),
        },
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        width: '100%',
      }} ref={refCallback} onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={click} key={idx}>
        <div css={{
          flexShrink: 0,
          width: '3em',
          height: '100%',
          fontWeight: 'bold',
          textAlign: 'right',
          padding: '0 0.5em',
        }}>{number}<span css={{
          [SMALL_AND_UP]: {
            display: 'none',
          },
        }}>{grid.entries[idx].direction === Direction.Across ? 'A' : 'D'}</span>
        </div>
        <div css={{
          flex: '1 1 auto',
          height: '100%',
        }}>{clue}</div>
      </li>
    );
  });
  const acrossClues = listItems.filter(filt(Direction.Across));
  const downClues = listItems.filter(filt(Direction.Down));

  return (
    <React.Fragment>
      <TopBar>
        <TopBarLink icon={<FaKeyboard/>} text="toggle keyboard" onClick={toggleKeyboard}/>
      </TopBar>
      <SquareAndCols
        showKeyboard={showKeyboard}
        isTablet={false}
        square={
          <Grid
            showingKeyboard={showKeyboard}
            grid={grid} setCellValues={setInput}
            active={active} setActive={setActive}
            direction={direction} setDirection={setDirection}
          />
        }
        left={<ClueList header="Across" clues={acrossClues} />}
        right={<ClueList header="Down" clues={downClues} />}
        tinyColumn={<ClueList clues={acrossClues.concat(downClues)} />}
      />
    </React.Fragment>
  )
}
