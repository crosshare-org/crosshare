import { mix, transparentize } from 'color2k';
import { memo, useEffect, useRef, useState } from 'react';
import { FaEye, FaSlash } from 'react-icons/fa';
import { useSize } from '../lib/hooks.js';
import { Position } from '../lib/types.js';
import { clsx } from '../lib/utils.js';
import styles from './Cell.module.css';

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
  selected: boolean;
  isSelecting: boolean;
  styles: string[];
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

function mixColors(colors: string[]) {
  return colors.reduce<[string | null, number]>(
    (prev: [string | null, number], curr) => {
      if (prev[0] === null) return [curr, 2] as [string | null, number];
      return [mix(prev[0], curr, 1.0 / prev[1]), prev[1] + 1] as [
        string | null,
        number,
      ];
    },
    [null, 1]
  )[0];
}

export const Cell = memo(function Cell(props: CellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: cqw } = useSize(containerRef);
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

  // TODO replace this w/ data attributes and do all of this in CSS
  let containerClass: string | undefined;
  if (props.isEnteringRebus && props.active) {
    /* noop */
  } else if (props.isBlock && props.active) {
    containerClass = styles.cellContainerActiveBlock;
  } else if (props.isBlock && props.selected) {
    containerClass = styles.cellContainerSelectedBlock;
  } else if (props.isBlock) {
    containerClass = styles.cellContainerBlock;
  } else if (props.cellColor !== undefined) {
    containerClass = styles.cellContainerShaded;
  } else if (props.isEnteringRebus) {
    /* noop */
  } else if (props.active) {
    containerClass = styles.cellContainerActive;
  } else if (props.selected) {
    containerClass = styles.cellContainerSelected;
  } else if (props.entryCell && !props.isSelecting) {
    containerClass = styles.cellContainerEntryCell;
  } else if (props.refedCell) {
    containerClass = styles.cellContainerRefed;
  }

  const filledValue =
    props.active && props.isEnteringRebus
      ? (props.rebusValue ?? '')
      : props.value.trim();
  const value =
    props.active && props.isEnteringRebus
      ? filledValue
      : filledValue || props.autofill;

  let boxShadow: string | undefined;
  if (props.isEnteringRebus && props.active) {
    boxShadow = styles.enteringRebus;
  } else if (props.cellColor !== undefined) {
    if (props.active) {
      boxShadow = styles.statsActive;
    } else if (props.entryCell) {
      boxShadow = styles.statsEntry;
    }
  }

  // Our constructor only allows one color at a time but the data model supports multiple - just mix them if present
  const highlightColor = mixColors(
    props.styles.filter((c) => !['circle', 'shade'].includes(c))
  );

  return (
    <div
      className={clsx(styles.cellContainer, useCQ && styles.cq, containerClass)}
      style={{
        width: `${100 / props.gridWidth}%`,
        paddingBottom: `${100 / props.gridWidth}%`,
        ...(props.cellColor && { '--cell-alpha': props.cellColor }),
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
        style={{ ...(!useCQ && { fontSize: `${cqw}px` }) }}
        className={clsx(
          styles.cell,
          props.hidden && props.active && styles.cellHiddenActive,
          !props.hidden && styles.cellVisible,
          !props.hidden &&
            (props.row === props.gridHeight - 1 || props.hiddenBottom) &&
            styles.borderBottom,
          !props.hidden &&
            (props.column === props.gridWidth - 1 || props.hiddenRight) &&
            styles.borderRight,
          !props.hidden &&
            props.barBottom &&
            props.row !== props.gridHeight - 1 &&
            styles.barBottom,
          !props.hidden &&
            props.barRight &&
            props.column !== props.gridWidth - 1 &&
            styles.barRight,
          boxShadow
        )}
      >
        {!props.isBlock || (props.isEnteringRebus && props.active) ? (
          <>
            <div className={styles.number}>
              {props.wasRevealed ? (
                <div className={styles.eye}>
                  <FaEye />
                </div>
              ) : (
                ''
              )}
              {props.number}
            </div>
            <div
              className={clsx(
                styles.contents,
                props.isVerified
                  ? styles.contentsVerified
                  : filledValue
                    ? styles.contentsFilled
                    : null
              )}
            >
              {props.isWrong ? (
                <div className={styles.slash}>
                  <FaSlash />
                </div>
              ) : (
                ''
              )}
              {props.styles.includes('circle') ? (
                <div className={styles.circle} />
              ) : (
                ''
              )}
              {props.styles.includes('shade') ? (
                <div className={styles.shade} />
              ) : (
                ''
              )}
              {highlightColor ? (
                <div
                  className={styles.shade}
                  style={{
                    backgroundColor: transparentize(highlightColor, 0.7),
                  }}
                />
              ) : (
                ''
              )}
              <div
                style={{
                  fontSize: `${1.0 / Math.max(value.length - 0.4, 1)}em`,
                }}
              >
                {props.active && props.isEnteringRebus ? (
                  <>
                    {value}
                    <span className={styles.cursor} />
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
        {props.isOpposite ? <div className={styles.symmetricCellTag} /> : ''}
      </div>
    </div>
  );
});
