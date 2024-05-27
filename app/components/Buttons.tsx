import { MouseEvent, ReactNode } from 'react';
import { clsx } from '../lib/utils.js';
import styles from './Buttons.module.css';

interface ButtonCommonProps {
  title?: string;
  disabled?: boolean;
  className?: string;
  hoverText?: string;
}
interface ButtonTextProps extends ButtonCommonProps {
  text: ReactNode;
  children?: never;
}
interface ButtonChildrenProps extends ButtonCommonProps {
  text?: never;
  children: ReactNode;
}
type ButtonBaseProps = ButtonTextProps | ButtonChildrenProps;
type DisabledProps = ButtonBaseProps & {
  disabled: true;
};
type SubmitProps = ButtonBaseProps & {
  type: 'submit';
};
type OnClickProps = ButtonBaseProps & {
  onClick: (e: MouseEvent) => void;
};
type ButtonProps = SubmitProps | OnClickProps | DisabledProps;

export function ButtonReset({
  text,
  children,
  hoverText,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(styles.reset, className)}
      data-hover-text={hoverText || ''}
      {...props}
    >
      {children !== undefined ? children : <span>{text}</span>}
    </button>
  );
}

export function ButtonAsLink({ className, ...props }: ButtonProps) {
  return <ButtonReset className={clsx(styles.link, className)} {...props} />;
}

export function Button({
  boring,
  hollow,
  className,
  ...props
}: ButtonProps & { boring?: boolean; hollow?: boolean }) {
  return (
    <ButtonReset
      className={clsx(styles.btn, className)}
      data-boring={boring}
      data-hollow={hollow}
      {...props}
    />
  );
}
