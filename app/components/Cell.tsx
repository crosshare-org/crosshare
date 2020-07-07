import { memo } from 'react';

import { FaSlash, FaEye } from 'react-icons/fa';

import {
  PRIMARY, SECONDARY, ERROR_COLOR,
} from '../lib/style';

type CellProps = {
  autofill: string,
  gridWidth: number,
  squareWidth: number,
  isBlock: boolean,
  active: boolean,
  entryCell: boolean,
  highlight: 'circle' | 'shade' | undefined,
  value: string,
  number: string,
  row: number,
  column: number,
  onClick: (pos: { row: number, col: number }) => void,
  isVerified: boolean | undefined,
  isWrong: boolean | undefined,
  wasRevealed: boolean | undefined,
}

export const Cell = memo(function Cell(props: CellProps) {
  let bg = 'var(--white)';
  if (props.isBlock && props.active) {
    bg = 'repeating-linear-gradient(-45deg,var(--cell-wall),var(--cell-wall) 10px,' + PRIMARY + ' 10px,' + PRIMARY + ' 20px);';
  } else if (props.isBlock) {
    bg = 'var(--cell-wall)';
  } else if (props.active) {
    bg = PRIMARY;
  } else if (props.entryCell) {
    bg = SECONDARY;
  }

  const cellSize = props.squareWidth / props.gridWidth;
  const value = props.value.trim() ? props.value : props.autofill;

  return (
    <div css={{
      width: (100 / props.gridWidth) + '%',
      paddingBottom: (100 / props.gridWidth) + '%',
      float: 'left',
      position: 'relative',
      margin: 0,
      overflow: 'hidden',
    }}>
      {/* eslint-disable-next-line */}
      <div aria-label={'cell' + props.row + 'x' + props.column} onClick={() => props.onClick({ row: props.row, col: props.column })} css={{
        userSelect: 'none',
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRight: '1px solid var(--cell-wall)',
        borderBottom: '1px solid var(--cell-wall)',
        borderTop: (props.row === 0) ? '1px solid var(--cell-wall)' : 0,
        borderLeft: (props.column === 0) ? '1px solid var(--cell-wall)' : 0,
        background: bg,

      }}>
        {!props.isBlock ?
          <>
            <div css={{
              position: 'absolute',
              left: '0.1em',
              top: 0,
              fontWeight: 'bold',
              lineHeight: '1em',

              fontSize: 0.25 * cellSize,
            }}>
              {props.wasRevealed ?
                <div css={{
                  position: 'absolute',
                  left: '1.85em',
                  top: '-0.1em',
                  fontSize: '1.2em',
                  color: 'var(--verified)',
                }}><FaEye /></div> : ''}
              {props.number}</div>
            <div css={{
              color: props.isVerified ? 'var(--verified)' : (props.value.trim() ? 'var(--black)' : 'var(--autofill)'),
              textAlign: 'center',
              lineHeight: '1.2em',
              fontSize: 0.9 * cellSize,
            }}>
              {props.isWrong ?
                <div css={{
                  position: 'absolute',
                  zIndex: 2,
                  left: '0.03em',
                  top: '-0.1em',
                  color: ERROR_COLOR,
                  fontSize: '1em',
                }}><FaSlash /></div> : ''}
              {props.highlight === 'circle' ?
                <div css={{
                  zIndex: 0,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  border: '1px solid var(--black)',
                  borderRadius: '50%',
                }}></div> : ''}
              {props.highlight === 'shade' ?
                <div css={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'var(--shade-highlight)',
                }}></div> : ''}
              <div css={{
                fontSize: 1.0 / Math.max(props.value.length - 0.4, 1) + 'em',
              }}>{value}</div>
            </div>
          </>
          : ''}
      </div>
    </div>
  );
});
