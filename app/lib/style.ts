import { CSSInterpolation } from '@emotion/serialize';
import { css } from '@emotion/react';
import { adjustHue, mix, readableColorIsBlack } from 'color2k';

export const KEYBOARD_HEIGHT = 164;
export const HEADER_HEIGHT = 35;
export const MAX_WIDTH = 1200;
export const PROFILE_PIC: [number, number] = [200, 200];
export const COVER_PIC: [number, number] = [1200, 400];

export const TINY_COL_MIN_HEIGHT = 50;
export const SQUARE_HEADER_HEIGHT = 68;
export const SMALL_BREAKPOINT = 576;
export const LARGE_BREAKPOINT = 992;
export const SMALL_AND_UP_RULES = '(min-width: ' + SMALL_BREAKPOINT + 'px)';
export const SMALL_AND_UP = '@media ' + SMALL_AND_UP_RULES;
export const LARGE_AND_UP = '@media (min-width: ' + LARGE_BREAKPOINT + 'px)';
export const HUGE_AND_UP = '@media (min-width: 1240px)';
export const HAS_PHYSICAL_KEYBOARD =
  '@media (hover: hover) and (pointer: fine)';

export const FULLSCREEN_CSS = css`
  html {
    -ms-overflow-style: none;
    scrollbar-color: transparent transparent;
    scrollbar-width: none;
    overscroll-behavior: none;
  }
  ::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
  html,
  body {
    overflow: hidden;
  }
`;

export const PRIMARY = '#eb984e';
export const LINK = '#2874a6';
const DARK_MODE_WHITE = '#d0d0d0';

export const readableColor = (color: string, darkMode: boolean) => {
  if (readableColorIsBlack(color)) {
    return '#000';
  } else if (darkMode) {
    return DARK_MODE_WHITE;
  } else {
    return '#fff';
  }
};

export interface ColorThemeProps {
  primary: string;
  link: string;
  darkMode: boolean;
  preservePrimary: boolean;
};

export const colorTheme = (
  {primary, link, darkMode, preservePrimary}: ColorThemeProps
): CSSInterpolation => {
  const p = darkMode && !preservePrimary ? mix(primary, 'black', 0.5) : primary;
  const l = darkMode && !preservePrimary ? mix(link, 'white', 0.5) : link;
  const cellBG = darkMode ? '#353535' : 'white';
  const hover = darkMode ? 'white' : 'black';
  const hoverRatio = 0.1;
  const bg = darkMode ? '#222' : '#fff';
  const linkLightBG = mix(link, bg, 0.9);
  const linkLightBGHover = mix(link, bg, 0.8);
  const text = darkMode ? DARK_MODE_WHITE : 'black';
  const secondary = darkMode ? '#505050' : '#ccc';
  const error = mix(adjustHue(p, 280), 'white', darkMode ? 0.3 : 0);
  return {
    '--tag-l': darkMode ? '30%' : '85%',
    '--bg': bg,
    '--primary': p,
    '--blue': darkMode ? mix('blue', 'white', 0.5) : 'blue',
    '--green': darkMode ? mix('green', 'white', 0.5) : 'green',
    '--onprimary': readableColor(p, darkMode),
    '--lighter': mix(p, cellBG, 0.6),
    '--secondary': secondary,
    '--bg-hover': mix(bg, hover, hoverRatio),
    '--secondary-hover': mix(secondary, hover, hoverRatio),
    '--boring-bg': darkMode ? '#b5b5b5' : '#555',
    '--onboring': readableColor(darkMode ? '#b5b5b5' : '#555', darkMode),
    '--boring-bg-hover': darkMode ? '#bbb' : '#5f5f5f',
    '--error': error,
    '--error-hover': mix(error, 'black', 0.3),
    '--onerror': readableColor(error, darkMode),
    '--notification-bg': '#de30e7',
    '--link': l,
    '--link-light-bg': linkLightBG,
    '--link-light-bg-hover': linkLightBGHover,
    '--onlink': readableColor(l, darkMode),
    '--link-hover': mix(l, hover, hoverRatio),
    '--text': text,
    '--completed-clue': mix(text, bg, 0.4),
    '--logo-white': darkMode ? DARK_MODE_WHITE : 'white',
    '--default-text': darkMode ? '#777' : '#999',
    '--caption': '#6c757d',
    '--black': darkMode ? '#eee' : 'black',
    '--verified': mix(adjustHue(p, 180), hover, darkMode ? 0.4 : 0.3),
    '--autofill': darkMode ? '#999' : '#bbb',
    '--top-bar-hover': 'rgba(0, 0, 0, 0.1)',
    '--shade-highlight': darkMode
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.3)',
    '--overlay-bg': 'rgba(0, 0, 0, 0.85)',
    '--overlay-inner': darkMode ? '#252525' : 'white',
    '--conceal-text': darkMode ? 'white' : 'rgba(0, 0, 0, 0.7)',
    '--cell-bg': cellBG,
    '--cell-wall': 'black',
    '--white': darkMode ? '#000' : 'white',
    '--key-bg': darkMode ? 'rgba(255, 255, 255, 0.15)' : 'white',
    '--key-ul': darkMode ? 'black' : '#b5b5b5',
    '--kb-bg': darkMode ? '#191919' : '#ececec',
    '--kb-bg-click': darkMode ? 'black' : '#ddd',
    '--text-input-bg': darkMode ? '#333' : '#f5f5f5',
    '--text-input-border': darkMode ? '#000' : '#777',
    '--snackbar-bg': darkMode ? '#ddd' : '#121212',
    '--snackbar-text': darkMode ? 'black' : '#ddd',
    '--social-text': darkMode ? '#ddd' : '#fff',
  };
};
