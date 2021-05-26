import { ReactNode, RefObject, useState, useEffect } from 'react';
import { usePolyfilledResizeObserver } from '../lib/hooks';
import {
  TINY_COL_MIN_HEIGHT,
  SMALL_BREAKPOINT,
  LARGE_BREAKPOINT,
  SQUARE_HEADER_HEIGHT,
  SMALL_AND_UP,
} from '../lib/style';

interface SquareProps {
  header?: ReactNode;
  aspectRatio: number;
  contents: (width: number, height: number) => ReactNode;
  parentRef: RefObject<HTMLElement>;
  waitToResize?: boolean;
}
export const Square = (props: SquareProps) => {
  const { width, height } = usePolyfilledResizeObserver(props.parentRef);
  const [outWidth, setOutWidth] = useState(320);
  const [outHeight, setOutHeight] = useState(320);
  useEffect(() => {
    if (!width || !height || props.waitToResize) {
      return;
    }
    let newHeight = height - TINY_COL_MIN_HEIGHT;
    let newWidth = width;
    if (width >= LARGE_BREAKPOINT) {
      newHeight =
        height - (props.header !== undefined ? SQUARE_HEADER_HEIGHT : 0);
      newWidth = width * 0.5;
    } else if (width >= SMALL_BREAKPOINT) {
      newHeight =
        height - (props.header !== undefined ? SQUARE_HEADER_HEIGHT : 0);
      newWidth = width * 0.66;
    }
    setOutWidth(Math.min(newWidth, props.aspectRatio * newHeight));
    setOutHeight(Math.min(newWidth / props.aspectRatio, newHeight));
  }, [width, height, props.aspectRatio, props.waitToResize, props.header]);

  return (
    <div
      css={{
        flex: 'none',
        width: outWidth,
        height: outHeight,
        [SMALL_AND_UP]: {
          height:
            outHeight + (props.header !== undefined ? SQUARE_HEADER_HEIGHT : 0),
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
        css={{ flex: 'none', width: outWidth, height: outHeight }}
      >
        {props.contents(outWidth, outHeight)}
      </div>
    </div>
  );
};
