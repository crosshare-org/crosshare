import { ReactNode, useState, useEffect } from 'react';
import { useHover } from '../lib/hooks';
import { usePopper } from 'react-popper';

export const ToolTipText = (props: { text: string, tooltip: ReactNode }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLSpanElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null);
  const [isHovered, hoverBind] = useHover();
  const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
    strategy: 'fixed',
    modifiers: [
      { name: 'hide' },
      { name: 'arrow', options: { element: arrowElement } },
      { name: 'offset', options: { offset: [0, 10] } }
    ],
  });

  useEffect(() => {
    if (isHovered) {
      update ?.();
    }
  }, [update, isHovered]);

  return <>
    <span css={{
      borderBottom: '1px dotted',
      whiteSpace: 'nowrap',
    }} ref={setReferenceElement} {...hoverBind}>
      {props.text}
    </span>
    <div css={{
      zIndex: 100000,
      borderRadius: '5px',
      backgroundColor: 'var(--black)',
      color: 'var(--white)',
      textAlign: 'center',
      padding: '10px',
      visibility: isHovered ? 'visible' : 'hidden',
      '&[data-popper-reference-hidden=true]': {
        visibility: 'hidden'
      },
    }} ref={setPopperElement} style={styles.popper} {...attributes.popper}>
      {props.tooltip}
      <div css={{
        position: 'absolute',
        width: '10px',
        height: '10px',
        '[data-popper-placement^="bottom"] &': {
          top: '-5px',
        },
        '[data-popper-placement^="top"] &': {
          bottom: '-5px',
        },
        '&::after': {
          content: '" "',
          position: 'absolute',
          transform: 'rotate(45deg)',
          width: '10px',
          height: '10px',
          backgroundColor: 'var(--black)',
        }
      }} ref={setArrowElement} style={styles.arrow} />
    </div>
  </>;
};
