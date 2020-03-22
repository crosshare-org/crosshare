/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { FaSlash, FaEye } from 'react-icons/fa';

import {heightAdjustment, notSelectable, PRIMARY, SECONDARY, SMALL_AND_UP, LARGE_AND_UP} from './style';

type CellProps = {
  showingKeyboard: boolean,
  gridWidth: number,
  isBlock: boolean,
  active: boolean,
  entryCell: boolean,
  highlight: "circle" | "shade" | undefined,
  value: string,
  number: string,
  row: number,
  column: number,
  onClick: (pos:{row: number, col:number}) => void,
  isVerified: boolean,
  isWrong: boolean,
  wasRevealed: boolean,
}

export const Cell = React.memo((props: CellProps) => {
  let bg = "white";
  if (props.isBlock && props.active) {
    bg = "repeating-linear-gradient(-45deg,black,black 10px," + PRIMARY + " 10px," + PRIMARY + " 20px);"
  } else if (props.isBlock) {
    bg = "black";
  } else if (props.active) {
    bg = PRIMARY;
  } else if (props.entryCell) {
    bg = SECONDARY;
  }

  const heightAdjust = heightAdjustment(props.showingKeyboard);

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
            fontSize: 'calc(0.25 * min(87vh - ' + heightAdjust + 'px, 100vw) / ' + props.gridWidth + ')',
            [SMALL_AND_UP]: {
              fontSize: 'calc(0.25 * min(100vh - ' + heightAdjust + 'px, 66vw) / ' + props.gridWidth + ')',
            },
            [LARGE_AND_UP]: {
              fontSize: 'calc(0.25 * min(100vh - ' + heightAdjust + 'px, 50vw) / ' + props.gridWidth + ')',
            },
          }}>
          { props.wasRevealed ?
          <div css={{
            position: 'absolute',
            left: '1.85em',
            top: '-0.1em',
            fontSize: '1.2em',
            color: '#4e61eb',
          }}><FaEye/></div> : "" }
          {props.number}</div>
          <div css={{
            color: props.isVerified ? '#4e61eb' : 'black',
            textAlign: 'center',
            lineHeight: '1.2em',
            fontSize: 'calc(0.9 * min(87vh - ' + heightAdjust + 'px, 100vw) / ' + props.gridWidth + ')',
            [SMALL_AND_UP]: {
              fontSize: 'calc(0.9 * min(100vh - ' + heightAdjust + 'px, 66vw) / ' + props.gridWidth + ')',
            },
            [LARGE_AND_UP]: {
              fontSize: 'calc(0.9 * min(100vh - ' + heightAdjust + 'px, 50vw) / ' + props.gridWidth + ')',
            },
          }}>
          { props.isWrong ?
          <div css={{
            position: 'absolute',
            zIndex: 2,
            left: '0.03em',
            top: '-0.1em',
            color: '#e34eeb',
            fontSize: '1em',
          }}><FaSlash/></div> : "" }
          {props.highlight === 'circle' ?
          <div css={{
            zIndex: 0,
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            border: '1px solid black',
            borderRadius: '50%',
          }}></div> : ""}
          {props.highlight === 'shade' ?
          <div css={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}></div> : ""}
          <div css={{
            fontSize: 1.0 / Math.max(props.value.length - 0.4, 1) + 'em',
          }}>{props.value}</div>
          </div>
          </React.Fragment>
          : ""}
      </div>
    </div>
  );
});
