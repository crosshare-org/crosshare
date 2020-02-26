/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import {notSelectable, PRIMARY, SECONDARY, HEADER_FOOTER_HEIGHT} from './style';

type CellProps = {
  gridWidth: number,
  isBlock: boolean,
  active: boolean,
  highlight: boolean,
  value: string,
  number: string,
  row: number,
  column: number,
  onClick: (pos:{row: number, col:number}) => void
}

export default function Cell(props: CellProps) {
  let bg = "white";
  if (props.isBlock && props.active) {
    bg = "repeating-linear-gradient(-45deg,black,black 10px," + PRIMARY + " 10px," + PRIMARY + " 20px);"
  } else if (props.isBlock) {
    bg = "black";
  } else if (props.active) {
    bg = PRIMARY;
  } else if (props.highlight) {
    bg = SECONDARY;
  }

  return (
    <div className="cell-container" css={{
      width: (100 / props.gridWidth) + '%',
      paddingBottom: (100 / props.gridWidth) + '%',
      float: 'left',
      position: 'relative',
      margin: 0,
      overflow: 'hidden',
    }}>
      <div onClick={() => props.onClick({row: props.row, col: props.column})} css={[notSelectable, {
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRight: '1px solid black',
          borderBottom: '1px solid black',
          borderTop: (props.row === 0) ? '1px solid black' : 0,
          borderLeft: (props.column === 0) ? '1px solid black' : 0,
          background: bg,

      }]}>
        {!props.isBlock ?
          <React.Fragment>
          <div css={{
            position: 'absolute',
            left: '0.1em',
            top: 0,
            fontWeight: 'bold',
            lineHeight: '1em',
            fontSize: 'calc(0.3 * min(60vh - ' + HEADER_FOOTER_HEIGHT + 'px, 100vw) / ' + props.gridWidth + ')',
            '@media (min-width: 576px)': {
              fontSize: 'calc(0.3 * min(100vh - ' + HEADER_FOOTER_HEIGHT + 'px, 66vw) / ' + props.gridWidth + ')',
            },
            '@media (min-width: 992px)': {
              fontSize: 'calc(0.3 * min(100vh - ' + HEADER_FOOTER_HEIGHT + 'px, 50vw) / ' + props.gridWidth + ')',
            },
          }}>{props.number}</div>
          <div css={{
            textAlign: 'center',
            lineHeight: '1.2em',
            fontSize: 'calc(0.9 * min(60vh - ' + HEADER_FOOTER_HEIGHT + 'px, 100vw) / ' + props.gridWidth + ')',
            '@media (min-width: 576px)': {
              fontSize: 'calc(0.9 * min(100vh - ' + HEADER_FOOTER_HEIGHT + 'px, 66vw) / ' + props.gridWidth + ')',
            },
            '@media (min-width: 992px)': {
              fontSize: 'calc(0.9 * min(100vh - ' + HEADER_FOOTER_HEIGHT + 'px, 50vw) / ' + props.gridWidth + ')',
            },
          }}>{props.value}</div>
          </React.Fragment>
          : ""}
      </div>
    </div>
  );
}
