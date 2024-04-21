import NextLink from 'next/link';
import { ReactNode, useContext } from 'react';
import { clsx } from '../lib/utils';
// eslint-disable-next-line css-modules/no-unused-class
import styles from './Buttons.module.css'; // TODO refactor Link/Button components so we aren't importing the same CSS module in both (which next.js recommends against)
import { EmbedContext } from './EmbedContext';

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
  noTargetBlank?: boolean;
}

export function LinkButton({ className, ...props }: LinkProps) {
  return (
    /* eslint-disable-next-line jsx-a11y/anchor-has-content */
    <Link
      className={clsx(
        styles.reset,
        styles.btn,
        'displayInlineBlock',
        className
      )}
      {...props}
    />
  );
}

export function LinkButtonSimpleA(props: {
  text: string;
  href: string;
  className?: string;
}) {
  return (
    <a
      className={clsx(
        styles.reset,
        styles.btn,
        'displayInlineBlock',
        props.className
      )}
      target="_blank"
      rel="noopener noreferrer"
      href={props.href}
    >
      {props.text}
    </a>
  );
}

export const Link = ({ href, children, noTargetBlank, ...rest }: LinkProps) => {
  const { isEmbed } = useContext(EmbedContext);
  if (isEmbed && !noTargetBlank) {
    return (
      <a target="_blank" rel="noreferrer" href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} {...rest}>
      {children}
    </NextLink>
  );
};
