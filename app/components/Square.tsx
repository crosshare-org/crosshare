import { ReactNode, useState, useRef, useEffect } from 'react';
import createDetectElementResize from '../vendor/detectElementResize';
import {
  TINY_COL_MIN_HEIGHT, SMALL_BREAKPOINT, LARGE_BREAKPOINT
} from '../lib/style';

interface SquareProps {
  contents: (size: number) => ReactNode,
}
export const Square = (props: SquareProps) => {
  const [size, setSize] = useState(200);
  const squareElem = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const heightAdjust = parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--height-adjustment'));
    const detectElementResize = createDetectElementResize(null);
    if (squareElem.current) {
      const parent = squareElem.current.parentNode;
      if (parent && parent instanceof HTMLElement) {
        const onResize = () => {
          const winHeight = window.innerHeight;
          const winWidth = window.innerWidth;
          let width = parent.offsetWidth || 0;
          let maxHeight = winHeight - TINY_COL_MIN_HEIGHT - heightAdjust;
          let maxWidth = winWidth;
          if (width >= LARGE_BREAKPOINT) {
            maxHeight = winHeight - heightAdjust;
            maxWidth = winWidth * 0.5;
          } else if (width >= SMALL_BREAKPOINT) {
            maxHeight = winHeight - heightAdjust;
            maxWidth = winWidth * 0.66;
          }
          width = Math.min(width, maxWidth);
          const height = Math.min(parent.offsetHeight || 0, maxHeight);
          const style = window.getComputedStyle(parent) || {};
          const paddingLeft = parseInt(style.paddingLeft, 10) || 0;
          const paddingRight = parseInt(style.paddingRight, 10) || 0;
          const paddingTop = parseInt(style.paddingTop, 10) || 0;
          const paddingBottom = parseInt(style.paddingBottom, 10) || 0;
          const newHeight = height - paddingTop - paddingBottom;
          const newWidth = width - paddingLeft - paddingRight;
          setSize(Math.min(newHeight, newWidth));
        };
        onResize();
        detectElementResize.addResizeListener(parent, onResize);
        return () => detectElementResize.removeResizeListener(parent, onResize);
      }
    }
  }, []);

  return (
    <div aria-label='grid' ref={squareElem} css={{
      flex: 'none',
      width: size,
      height: size
    }}>{props.contents(size)}</div>
  );
};
