import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { ComponentProps } from 'react';
import { ButtonResetCSS, ButtonCSS } from './Buttons';

export interface LinkProps
  extends NextLinkProps,
  Omit<ComponentProps<'a'>, keyof NextLinkProps> { }

export function LinkButton(props: LinkProps) {
  /* href is passed by NextLink */
  /* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/anchor-has-content */
  return <Link css={[ButtonResetCSS, ButtonCSS, {
    display: 'inline-block',
  }]} {...props} />;
}

export function LinkButtonSimpleA(props: { text: string, href: string, className?: string }) {
  return <a className={props.className} css={[ButtonResetCSS, ButtonCSS, {
    display: 'inline-block',
  }]} target="_blank" rel="noopener noreferrer" href={props.href}>{props.text}</a>;
}

export const Link = ({
  href,
  as,
  replace,
  scroll,
  shallow,
  passHref,
  prefetch,
  ...rest
}: LinkProps) => (
  <NextLink
    href={href}
    as={as}
    replace={replace}
    scroll={scroll}
    shallow={shallow}
    passHref={passHref}
    prefetch={prefetch}
  >
    {/* href is passed by NextLink */}
    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/anchor-has-content */}
    <a {...rest} />
  </NextLink>
);
