import {css} from '@emotion/core';

export const KEYBOARD_HEIGHT = 140;
export const FOOTER_HEIGHT = 20;
export const HEADER_HEIGHT = 35;
export const HEADER_FOOTER_HEIGHT = 35;
export const PRIMARY = '#EB984E';
export const LIGHTER = '#EBBC94';
export const SECONDARY = '#E2E2E2';

export const notSelectable = css`
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
`;

export const SMALL_AND_UP = '@media (min-width: 576px)';
export const LARGE_AND_UP = '@media (min-width: 992px)';
