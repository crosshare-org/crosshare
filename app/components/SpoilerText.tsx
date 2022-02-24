import { ReactNode, useState, useCallback } from 'react';

export const SpoilerText = ({ children }: { children: ReactNode }) => {
  const [revealed, setRevealed] = useState(false);

  const doReveal = useCallback(
    (e) => {
      if (!revealed) {
        e.stopPropagation();
        setRevealed(true);
      }
    },
    [revealed]
  );

  return (
    <span
      onClick={doReveal}
      onKeyPress={doReveal}
      role="button"
      tabIndex={0}
      css={{
        ...(!revealed && {
          backgroundColor: 'var(--text)',
          cursor: 'pointer',
          userSelect: 'none',
          '& *': {
            visibility: 'hidden',
          },
        }),
      }}
    >
      {children}
    </span>
  );
};
