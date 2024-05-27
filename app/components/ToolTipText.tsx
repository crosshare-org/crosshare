import {
  FloatingArrow,
  FloatingPortal,
  arrow,
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import { ReactNode, useRef, useState } from 'react';
import { clsx } from '../lib/utils.js';
import styles from './ToolTipText.module.css';

export const ToolTipText = (props: {
  text: ReactNode;
  tooltip: ReactNode;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);
  const { refs, floatingStyles, context, middlewareData } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip(),
      shift({
        limiter: limitShift(),
      }),
      arrow({
        element: arrowRef,
      }),
      hide(),
    ],
  });

  const click = useClick(context);
  const hover = useHover(context, {
    handleClose: safePolygon(),
  });
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    dismiss,
  ]);

  return (
    <>
      <span
        data-is-string={typeof props.text === 'string'}
        className={clsx(props.className, styles.text)}
        ref={refs.setReference}
        {...getReferenceProps({
          onClick: (e) => {
            e.stopPropagation();
          },
        })}
      >
        {props.text}
      </span>
      {isOpen && (
        <FloatingPortal>
          <span
            data-hidden={middlewareData.hide?.referenceHidden}
            className={clsx(styles.tip, 'reverse-theme')}
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              fill={'var(--bg)'}
            />
            {props.tooltip}
          </span>
        </FloatingPortal>
      )}
    </>
  );
};
