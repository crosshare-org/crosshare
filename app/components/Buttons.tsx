import { MouseEvent } from 'react';
import { Interpolation } from '@emotion/core';

interface ButtonBaseProps {
  text: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  hoverText?: string;
  subCSS?: Interpolation<undefined>;
  hoverCSS?: Interpolation<undefined>;
}
interface DisabledProps extends ButtonBaseProps {
  disabled: true;
}
interface SubmitProps extends ButtonBaseProps {
  type: 'submit';
}
interface OnClickProps extends ButtonBaseProps {
  onClick: (e: MouseEvent) => void;
}
type ButtonProps = SubmitProps | OnClickProps | DisabledProps;

export const ButtonResetCSS: Interpolation<undefined> = {
  border: 'none',
  backgroundColor: 'transparent',
  fontFamily: 'inherit',
  padding: '0',
  color: 'inherit',
  cursor: 'pointer',
  textDecoration: 'none',
  '@media screen and (-ms-high-contrast: active)': {
    border: '2px solid currentcolor',
  },
  '&:disabled': {
    cursor: 'default',
    color: 'var(--default-text)',
  },
};

export function ButtonReset({
  text,
  hoverText,
  subCSS,
  hoverCSS,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      css={[
        ButtonResetCSS,
        subCSS,
        {
          ...(hoverCSS && {
            '&:hover': hoverCSS,
          }),
          ...(hoverText && {
            '&:hover span': {
              display: 'none',
            },
            '&:hover:after': {
              content: `"${hoverText}"`,
            },
          }),
        },
      ]}
      {...props}
    >
      <span>{text}</span>
    </button>
  );
}

export function ButtonAsLink(props: ButtonProps) {
  return (
    <ButtonReset
      subCSS={{
        color: 'var(--link)',
        '&:hover': {
          textDecoration: 'underline',
          color: 'var(--link-hover)',
        },
        '&:disabled': {
          textDecoration: 'none',
        },
        '&:hover:disabled': {
          color: 'var(--default-text)',
        },
      }}
      {...props}
    />
  );
}

export const ButtonCSS: Interpolation<undefined> = {
  overflow: 'wrap',
  maxWidth: '100%',
  /* create a small space when buttons wrap on 2 lines */
  margin: '2px 0',
  /* invisible border (will be colored on hover/focus) */
  border: 'solid 1px transparent',
  borderRadius: 4,
  padding: '0.5em 1em',
  color: 'var(--white)',
  backgroundColor: 'var(--link)',
  lineHeight: 1.1,
  textAlign: 'center',
  boxShadow: '0 3px 5px rgba(0, 0, 0, 0.18)',
  '&:disabled': {
    color: 'var(--default-text)',
    borderColor: 'var(--default-text)',
    backgroundColor: 'transparent',
  },
  '&:active': {
    transform: 'translateY(1px)',
  },
  '&:hover': {
    textDecoration: 'none',
    color: 'var(--white)',
    backgroundColor: 'var(--link-hover)',
  },
  '&:hover:disabled': {
    color: 'var(--default-text)',
    borderColor: 'var(--default-text)',
    backgroundColor: 'transparent',
  },
};

export function Button({
  boring,
  hollow,
  ...props
}: ButtonProps & { boring?: boolean; hollow?: boolean }) {
  return (
    <ButtonReset
      subCSS={[
        ButtonCSS,
        {
          ...(boring && {
            backgroundColor: 'var(--boring-bg)',
            '&:hover:enabled': {
              backgroundColor: 'var(--boring-bg-hover)',
            },
          }),
          ...(hollow && {
            border: 'solid 2px var(--link)',
            color: 'var(--link)',
            backgroundColor: 'transparent',
          }),
        },
      ]}
      {...props}
    />
  );
}
