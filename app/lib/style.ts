import { css } from '@emotion/core';

export const KEYBOARD_HEIGHT = 164;
export const HEADER_HEIGHT = 35;
export const PRIMARY = 'var(--primary)';
export const LIGHTER = 'var(--lighter)';
export const SECONDARY = 'var(--secondary)';
export const ERROR_COLOR = 'var(--error)';

export const buttonAsLink = css`
  background: none!important;
  border: none;
  padding: 0!important;
  color: var(--link);
  text-decoration: none;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
    color: var(--link-hover);
  }
  &:disabled {
    text-decoration: none;
    color: var(--default-text);
    cursor: default;
  }
`;

export const TINY_COL_MIN_HEIGHT = 75;
export const SMALL_BREAKPOINT = 576;
export const LARGE_BREAKPOINT = 992;
export const SMALL_AND_UP_RULES = '(min-width: ' + SMALL_BREAKPOINT + 'px)';
export const SMALL_AND_UP = '@media ' + SMALL_AND_UP_RULES;
export const LARGE_AND_UP = '@media (min-width: ' + LARGE_BREAKPOINT + 'px)';
export const HAS_PHYSICAL_KEYBOARD = '@media (hover: hover) and (pointer: fine)';
