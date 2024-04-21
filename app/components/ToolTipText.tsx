import {
  useHover,
  useClick,
  useDismiss,
  useFloating,
  offset,
  shift,
  limitShift,
  flip,
  hide,
  useInteractions,
  autoUpdate,
  FloatingPortal,
  FloatingArrow,
  arrow,
} from '@floating-ui/react';
import { ReactNode, useState, useRef } from 'react';

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
  const hover = useHover(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    dismiss,
  ]);

  return (
    <>
      <span
        className={props.className}
        css={{
          ...(typeof props.text === 'string' && { borderBottom: '1px dotted' }),
          whiteSpace: 'nowrap',
        }}
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
            css={{
              display: 'block',
              zIndex: 100000,
              borderRadius: '5px',
              backgroundColor: 'var(--black)',
              color: 'var(--white)',
              textAlign: 'center',
              maxWidth: '30em',
              padding: '10px',
              visibility: middlewareData.hide?.referenceHidden
                ? 'hidden'
                : 'visible',
            }}
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              fill={'var(--black)'}
            />
            {props.tooltip}
          </span>
        </FloatingPortal>
      )}
    </>
  );
};
