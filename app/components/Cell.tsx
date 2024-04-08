import { keyframes } from '@emotion/react';
import { memo, useEffect, useRef, useState } from 'react';

import { FaSlash, FaEye } from 'react-icons/fa';
import { usePolyfilledResizeObserver } from '../lib/hooks';
import { Position } from '../lib/types';

const blink = keyframes`
from, to {
  background-color: transparent;
}
50% {
  background-color: var(--text);
}
`;

const Cursor = () => {
  return (
    <span
      css={{
        width: '0.05em',
        height: '0.8em',
        position: 'relative',
        backgroundColor: 'var(--text)',
        top: '0.03em',
        display: 'inline-block',
        animation: `1s ${blink} step-end infinite`,
      }}
    ></span>
  );
};

interface CellProps {
  barRight: boolean;
  barBottom: boolean;
  hidden: boolean;
  hiddenRight: boolean;
  hiddenBottom: boolean;
  isEnteringRebus: boolean;
  rebusValue?: string;
  autofill: string;
  gridWidth: number;
  gridHeight: number;
  isBlock: boolean;
  active: boolean;
  entryCell: boolean;
  refedCell: boolean;
  highlightCell: boolean;
  selected: boolean;
  isSelecting: boolean;
  highlight: 'circle' | 'shade' | undefined;
  value: string;
  number: string;
  row: number;
  column: number;
  onClick: (pos: Position, shiftKey: boolean) => void;
  onMouseDown: (pos: Position) => void;
  onMouseEnter: (pos: Position) => void;
  isVerified: boolean | undefined;
  isWrong: boolean | undefined;
  wasRevealed: boolean | undefined;
  cellColor?: number;
  isOpposite: boolean;
}

export const Cell = memo(function Cell(props: CellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: cqw } = usePolyfilledResizeObserver(containerRef);
  const [useCQ, setUseCQ] = useState(true);
  useEffect(() => {
    // Can't use container query on chrome until this is fixed - https://issues.chromium.org/issues/331221743
    if (
      !('container' in document.documentElement.style) ||
      navigator.userAgent.includes('Chrome')
    ) {
      setUseCQ(false);
    }
  }, []);

  let bg = 'var(--cell-bg)';
  let text = 'var(--text)';
  let verified = 'var(--verified-on-bg)';
  if (props.isEnteringRebus && props.active) {
    /* noop */
  } else if (props.isBlock && props.active) {
    bg =
      'repeating-linear-gradient(-45deg,var(--cell-wall),var(--cell-wall) 10px,var(--primary) 10px,var(--primary) 20px);';
  } else if (props.isBlock && props.selected) {
    bg =
      'repeating-linear-gradient(-45deg,var(--cell-wall),var(--cell-wall) 10px,var(--selected-cell) 10px,var(--selected-cell) 20px);';
  } else if (props.isBlock) {
    bg = 'var(--cell-wall)';
  } else if (props.cellColor !== undefined) {
    bg = `rgba(241, 167, 45, ${props.cellColor})`;
  } else if (props.isEnteringRebus) {
    /* noop */
  } else if (props.active) {
    bg = 'var(--primary)';
    text = 'var(--onprimary)';
    verified = 'var(--verified-on-primary)';
  } else if (props.selected) {
    bg = 'var(--selected-cell)';
    text = 'var(--on-selected-cell)';
    verified = 'var(--verified-on-selected-cell)';
  } else if (props.entryCell && !props.isSelecting) {
    bg = 'var(--lighter)';
    text = 'var(--on-lighter)';
    verified = 'var(--verified-on-lighter)';
  } else if (props.refedCell) {
    bg = 'var(--secondary)';
    text = 'var(--on-secondary)';
    verified = 'var(--verified-on-secondary)';
  }

  const filledValue =
    props.active && props.isEnteringRebus
      ? props.rebusValue ?? ''
      : props.value.trim();
  const value =
    props.active && props.isEnteringRebus
      ? filledValue
      : filledValue || props.autofill;

  let boxShadow = '';
  if (props.isEnteringRebus && props.active) {
    boxShadow = 'inset 0 0 0 0.1em var(--primary)';
  } else if (props.highlightCell) {
    boxShadow = 'inset 0 0 0 0.02em var(--black)';
  } else if (props.cellColor !== undefined) {
    if (props.active) {
      boxShadow = 'inset 0 0 0 0.05em var(--black)';
    } else if (props.entryCell) {
      boxShadow = 'inset 0 0 0 0.02em var(--black)';
    }
  }

  return (
    <div
      css={{
        width: `${100 / props.gridWidth}%`,
        paddingBottom: `${100 / props.gridWidth}%`,
        float: 'left',
        position: 'relative',
        margin: 0,
        overflow: 'hidden',
        ...(useCQ && {
          containerType: 'size',
        }),
      }}
      ref={containerRef}
    >
      {/* eslint-disable-next-line */}
      <div
        aria-label={`cell${props.row}x${props.column}`}
        onClick={(evt) => {
          props.onClick({ row: props.row, col: props.column }, evt.shiftKey);
        }}
        onMouseDown={(evt) => {
          if (evt.buttons === 1) {
            props.onMouseDown({ row: props.row, col: props.column });
          }
        }}
        onMouseEnter={(evt) => {
          if (evt.buttons === 1) {
            props.onMouseEnter({ row: props.row, col: props.column });
          }
        }}
        css={{
          userSelect: 'none',
          position: 'absolute',
          width: '100%',
          height: '100%',
          fontSize: useCQ ? '100cqw' : `${cqw}px`,
          ...(props.hidden &&
            props.active && {
              background:
                'repeating-linear-gradient(-45deg,var(--cell-bg),var(--cell-bg) 10px,var(--primary) 10px,var(--primary) 20px)',
            }),
          ...(!props.hidden && {
            borderLeft: '1px solid var(--cell-wall)',
            borderTop: '1px solid var(--cell-wall)',
            ...((props.row === props.gridHeight - 1 || props.hiddenBottom) && {
              borderBottom: '1px solid var(--cell-wall)',
            }),
            ...(props.barBottom &&
              props.row !== props.gridHeight - 1 && {
                borderBottom: '0.05em solid var(--cell-wall)',
              }),
            ...((props.column === props.gridWidth - 1 || props.hiddenRight) && {
              borderRight: '1px solid var(--cell-wall)',
            }),
            ...(props.barRight &&
              props.column !== props.gridWidth - 1 && {
                borderRight: '0.05em solid var(--cell-wall)',
              }),
            background: bg,
            ...(boxShadow && { boxShadow }),
          }),
        }}
      >
        {!props.isBlock || (props.isEnteringRebus && props.active) ? (
          <>
            <div
              css={{
                position: 'absolute',
                left: '0.1em',
                top: 0,
                fontWeight: 'bold',
                lineHeight: '1em',
                color: text,
                fontSize: '0.25em',
              }}
            >
              {props.wasRevealed ? (
                <div
                  css={{
                    position: 'absolute',
                    left: '1.85em',
                    top: '-0.1em',
                    fontSize: '1.2em',
                    color: verified,
                  }}
                >
                  <FaEye />
                </div>
              ) : (
                ''
              )}
              {props.number}
            </div>
            <div
              css={{
                color: props.isVerified
                  ? verified
                  : filledValue
                  ? text
                  : 'var(--autofill)',
                textAlign: 'center',
                lineHeight: '1.2em',
                fontSize: '0.9em',
              }}
            >
              {props.isWrong ? (
                <div
                  css={{
                    position: 'absolute',
                    zIndex: 2,
                    left: '0.03em',
                    top: '-0.1em',
                    color: 'var(--error)',
                    fontSize: '1em',
                  }}
                >
                  <FaSlash />
                </div>
              ) : (
                ''
              )}
              {props.highlight === 'circle' ? (
                <div
                  css={{
                    zIndex: 0,
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    border: '1px solid var(--black)',
                    borderRadius: '50%',
                  }}
                ></div>
              ) : (
                ''
              )}
              {props.highlight === 'shade' ? (
                <div
                  css={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'var(--shade-highlight)',
                  }}
                ></div>
              ) : (
                ''
              )}
              <div
                css={{
                  fontSize: `${1.0 / Math.max(value.length - 0.4, 1)}em`,
                }}
              >
                {props.active && props.isEnteringRebus ? (
                  <>
                    {value}
                    <Cursor />
                  </>
                ) : (
                  value
                )}
              </div>
            </div>
          </>
        ) : (
          ''
        )}
        {props.isOpposite ? (
          <div
            css={{
              position: 'absolute',
              top: '0%',
              right: '0%',
              borderTop: '.3em solid var(--primary)',
              borderLeft: '.3em solid rgba(0, 0, 0, 0)',
            }}
          ></div>
        ) : (
          ''
        )}
      </div>
    </div>
  );
});
