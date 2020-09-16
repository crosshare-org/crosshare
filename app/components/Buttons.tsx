import { MouseEvent } from 'react';

interface ButtonBaseProps {
  text: string,
  disabled?: boolean,
  className?: string
}
interface SubmitProps extends ButtonBaseProps {
  type: 'submit'
}
interface OnClickProps extends ButtonBaseProps {
  onClick: (e: MouseEvent) => void,
}
type ButtonProps = SubmitProps | OnClickProps;

export function ButtonReset({ text, ...props }: ButtonProps) {
  return <button type="button" css={{
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
    }
  }} {...props}>{text}</button>;
}

export function ButtonAsLink(props: ButtonProps) {
  return <ButtonReset css={{
    color: 'var(--link)',
    '&:hover': {
      textDecoration: 'underline',
      color: 'var(--link-hover)',
    },
    '&:disabled': {
      textDecoration: 'none',
    }
  }} {...props} />;
}

export function Button(props: ButtonProps & { boring?: boolean }) {
  return <ButtonReset css={{
    /* create a small space when buttons wrap on 2 lines */
    margin: '2px 0',
    /* invisible border (will be colored on hover/focus) */
    border: 'solid 1px transparent',
    borderRadius: 4,
    padding: '0.5em 1em',
    color: 'var(--white)',
    backgroundColor: props.boring ? 'var(--boring-bg)' : 'var(--link)',
    lineHeight: 1.1,
    boxShadow: '0 3px 5px rgba(0, 0, 0, 0.18)',
    '&:disabled': {
      borderColor: 'var(--default-text)',
      backgroundColor: 'transparent',
    },
    '&:active': {
      transform: 'translateY(1px)',
    },
    '&:hover': {
      ...(!props.disabled) && { backgroundColor: props.boring ? 'var(--boring-bg-hover)' : 'var(--link-hover)' },
    },
  }} {...props} />;
}
