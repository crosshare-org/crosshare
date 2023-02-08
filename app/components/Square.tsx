import { ReactNode } from 'react';
import {
  SQUARE_HEADER_HEIGHT,
  SMALL_AND_UP,
  LARGE_AND_UP,
  TINY_COL_MIN_HEIGHT,
} from '../lib/style';

interface SquareProps {
  header?: ReactNode;
  aspectRatio: number;
  children?: ReactNode;
}
export const Square = (props: SquareProps) => {
  return (
    <div
      css={{
        flex: 'none',
        maxHeight: '100%',
        width: '100%',
        [SMALL_AND_UP]: {
          width: '66vw',
        },
        [LARGE_AND_UP]: {
          width: '50vw',
        },
      }}
    >
      <div
        css={{
          height: SQUARE_HEADER_HEIGHT,
          display: 'none',
          overflow: 'hidden',
          [SMALL_AND_UP]: {
            display: props.header !== undefined ? 'block' : 'none',
          },
        }}
      >
        {props.header}
      </div>
      <div
        aria-label="grid"
        css={{
          flex: 'none',
          maxWidth: '100%',
          maxHeight: `calc(100% - ${TINY_COL_MIN_HEIGHT}px)`,
          [SMALL_AND_UP]: {
            maxHeight:
              props.header !== undefined
                ? `calc(100% - ${SQUARE_HEADER_HEIGHT}px)`
                : '100%',
          },
          aspectRatio: `${props.aspectRatio}`,
        }}
      >
        {props.children}
      </div>
    </div>
  );
};
