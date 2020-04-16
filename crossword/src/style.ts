import {css} from '@emotion/core';
import { isMobileSafari, isChrome, isMobile } from "react-device-detect";

export const KEYBOARD_HEIGHT = 140;
export const FOOTER_HEIGHT = 20;
export const HEADER_HEIGHT = 35;
export const HEADER_FOOTER_HEIGHT = 35;
export const PRIMARY = 'var(--primary)';
export const LIGHTER = 'var(--lighter)';
export const SECONDARY = 'var(--secondary)';
export const ERROR_COLOR = 'var(--error)';

export function heightAdjustment(includeKeyboard: boolean, includeToolbar=true) {
  const keyboardHeight = includeKeyboard ? KEYBOARD_HEIGHT : 0;
  const heightAdjust = keyboardHeight + HEADER_FOOTER_HEIGHT;
  if (includeToolbar && (isMobileSafari || (isMobile && isChrome))) {
    return heightAdjust + 75;  // TODO Fix this crap!
  }
  return heightAdjust;
}

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
`;

export const notSelectable = css`
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
`;

export const SMALL_AND_UP = '@media (min-width: 576px)';
export const SMALL_AND_UP_WIDE = '@media (min-width: 576px) and (min-aspect-ratio: 32/22)';
export const SMALL_AND_UP_WIDE_KEYBOARD = '@media (min-width: 576px) and (min-aspect-ratio: 32/32)';
export const LARGE_AND_UP = '@media (min-width: 992px)';
export const LARGE_AND_UP_WIDE = '@media (min-width: 992px) and (min-aspect-ratio: 32/17)';
export const LARGE_AND_UP_WIDE_KEYBOARD = '@media (min-width: 992px) and (min-aspect-ratio: 32/22)';
