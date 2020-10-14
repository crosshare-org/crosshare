import { ReactNode, RefObject, useState, useEffect } from 'react';
import { usePolyfilledResizeObserver } from '../lib/hooks';
import {
  TINY_COL_MIN_HEIGHT, SMALL_BREAKPOINT, LARGE_BREAKPOINT
} from '../lib/style';

interface SquareProps {
  aspectRatio: number,
  contents: (width: number, height: number) => ReactNode,
  parentRef: RefObject<HTMLElement>,
  waitToResize?: boolean,
}
export const Square = (props: SquareProps) => {
  const { width, height } = usePolyfilledResizeObserver(props.parentRef);
  const [outWidth, setOutWidth] = useState(200);
  const [outHeight, setOutHeight] = useState(200);
  useEffect(() => {
    if (!width || !height || props.waitToResize) {
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
    setOutWidth(Math.min(newWidth, props.aspectRatio * newHeight));
    setOutHeight(Math.min(newWidth / props.aspectRatio, newHeight));
  }, [width, height, props.aspectRatio, props.waitToResize]);

  return (
    <div aria-label='grid' css={{
      flex: 'none',
      width: outWidth,
      height: outHeight
    }}>{props.contents(outWidth, outHeight)}</div>
  );
};
