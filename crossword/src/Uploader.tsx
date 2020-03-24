/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { isRight } from 'fp-ts/lib/Either'
import { RouteComponentProps } from "@reach/router";
import { PathReporter } from "io-ts/lib/PathReporter";

import { requiresAdmin } from './App';
import { Page } from './Page';
import { PuzzleJson, PuzzleJsonV } from './types';
import { Builder } from './Builder';

export const Uploader = requiresAdmin((_: RouteComponentProps) => {
  const [puzzle, setPuzzle] = React.useState<PuzzleJson|null>(null);
  const [error, setError] = React.useState<string|null>(null);

  function handleFile(f: FileList|null) {
    if (!f) {
      setError("No file selected");
      return;
    }
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      if (typeof(fileReader.result) !== 'string') {
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
    return <Builder {...puzzle} />
  }

  return (
    <Page>
      { error ? <p css={{ color: 'red' }}>{error}</p> : "" }
      <input type='file' accept='.xw' onChange={e => handleFile(e.target.files)}/>
    </Page>
  );
});
