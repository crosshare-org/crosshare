import NextLink from 'next/link';
import { ReactNode, useContext } from 'react';
import { ButtonResetCSS, ButtonCSS } from './Buttons';
import { EmbedContext } from './EmbedContext';

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
  noTargetBlank?: boolean;
}

export function LinkButton(props: LinkProps) {
  return (
    /* eslint-disable-next-line jsx-a11y/anchor-has-content */
    <Link
      css={[
        ButtonResetCSS,
        ButtonCSS,
        {
          display: 'inline-block',
        },
      ]}
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
      className={props.className}
      css={[
        ButtonResetCSS,
        ButtonCSS,
        {
          display: 'inline-block',
        },
      ]}
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
