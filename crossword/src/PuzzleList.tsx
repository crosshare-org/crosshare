/** @jsx jsx */
import { jsx } from '@emotion/core';

import { Link } from "@reach/router";

import { PuzzleResult } from './types';

export const PuzzleListItem = (props: PuzzleResult) => {
  return (
    <li key={props.id}><Link to={"/crosswords/" + props.id}>{props.title}</Link> by {props.authorName}</li>
  );
}
