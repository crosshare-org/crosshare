import { ReactNode, RefObject, useState, useEffect } from 'react';
import useResizeObserver from 'use-resize-observer';
import {
  TINY_COL_MIN_HEIGHT, SMALL_BREAKPOINT, LARGE_BREAKPOINT
} from '../lib/style';

import { ResizeObserver as Polyfill } from '@juggle/resize-observer';
// TODO conditional import only when we need the polyfill?
if (typeof window !== 'undefined') {
  window.ResizeObserver = window.ResizeObserver || Polyfill;
}

interface SquareProps {
  contents: (size: number) => ReactNode,
  parentRef: RefObject<HTMLElement>
}
export const Square = (props: SquareProps) => {
  const { width, height } = useResizeObserver({ ref: props.parentRef });
  const [size, setSize] = useState(200);
  useEffect(() => {
    if (!width || !height) {
      return;
    }
    let newHeight = height - TINY_COL_MIN_HEIGHT;
    let newWidth = width;
    if (width >= LARGE_BREAKPOINT) {
      newHeight = height;
      newWidth = width * 0.5;
    } else if (width >= SMALL_BREAKPOINT) {
      newHeight = height;
      newWidth = width * 0.66;
    }
    setSize(Math.min(newWidth, newHeight));
  }, [width, height]);

  return (
    <div aria-label='grid' css={{
      flex: 'none',
      width: size,
      height: size
    }}>{props.contents(size || 1)}</div>
  );
};
