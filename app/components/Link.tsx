import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { ComponentProps } from 'react';

export interface LinkProps
  extends NextLinkProps,
  Omit<ComponentProps<'a'>, keyof NextLinkProps> { }

export function LinkButton(props: LinkProps) {
  {/* href is passed by NextLink */ }
  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/anchor-has-content */ }
  return <Link css={{
    /* create a small space when buttons wrap on 2 lines */
    margin: '2px 0',
    /* invisible border (will be colored on hover/focus) */
    border: 'solid 1px transparent',
    borderRadius: 4,
    padding: '0.5em 1em',
    color: 'var(--white)',
    backgroundColor: 'var(--link)',
    lineHeight: 1.1,
    boxShadow: '0 3px 5px rgba(0, 0, 0, 0.18)',
    '&:active': {
      transform: 'translateY(1px)',
    },
    '&:hover': {
      backgroundColor: 'var(--link-hover)',
      textDecoration: 'none',
      color: 'var(--white)',
    },
  }} {...props} />;
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
