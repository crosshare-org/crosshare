/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { isRight } from 'fp-ts/lib/Either'
import { RouteComponentProps } from "@reach/router";
import { PathReporter } from "io-ts/lib/PathReporter";

import { requiresAdmin, AuthProps } from './App';
import { Page } from './Page';
import { PuzzleJson, PuzzleJsonV, ClueT, Direction } from './types';
import BuilderDBLoader from './Builder';

const Uploader = requiresAdmin((_: RouteComponentProps & AuthProps) => {
  const [puzzle, setPuzzle] = React.useState<PuzzleJson | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function handleFile(f: FileList | null) {
    if (!f) {
      setError("No file selected");
      return;
    }
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      if (typeof (fileReader.result) !== 'string') {
        setError("Invalid .xw file, not string");
        return;
      }
      const validationResult = PuzzleJsonV.decode(JSON.parse(fileReader.result));
      if (isRight(validationResult)) {
        setPuzzle(validationResult.right);
        setError(null);
      } else {
        setError(PathReporter.report(validationResult).join(","));
      }
    };
    fileReader.readAsText(f[0]);
  }

  if (puzzle) {
    const clues: Array<ClueT> = [];
    const inputs: Array<[Direction, string[]]> = [
      [Direction.Across, puzzle.clues.across],
      [Direction.Down, puzzle.clues.down]
    ];
    for (let [direction, cluesForDir] of inputs) {
      cluesForDir.forEach(s => {
        let match = s.match(/^(\d+)\. (.+)$/);
        if (!match || match.length < 3) {
          throw new Error("Bad clue data: '" + s + "'");
        }
        clues.push({ num: +match[1], dir: direction, clue: match[2] });
      });
    }
    return <BuilderDBLoader {...puzzle} clues={clues} />
  }

  return (
    <Page title="Upload Puzzle">
      {error ? <p css={{ color: 'var(--error)' }}>{error}</p> : ""}
      <input type='file' accept='.xw' onChange={e => handleFile(e.target.files)} />
    </Page>
  );
});

export default Uploader;
