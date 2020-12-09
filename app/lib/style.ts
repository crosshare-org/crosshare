import { CSSInterpolation } from '@emotion/serialize';
import { adjustHue, mix } from 'color2k';

export const KEYBOARD_HEIGHT = 164;
export const HEADER_HEIGHT = 35;
export const MAX_WIDTH = 1200;
export const PROFILE_PIC: [number, number] = [200, 200];
export const COVER_PIC: [number, number] = [1200, 400];

export const TINY_COL_MIN_HEIGHT = 75;
export const SMALL_BREAKPOINT = 576;
export const LARGE_BREAKPOINT = 992;
export const SMALL_AND_UP_RULES = '(min-width: ' + SMALL_BREAKPOINT + 'px)';
export const SMALL_AND_UP = '@media ' + SMALL_AND_UP_RULES;
export const LARGE_AND_UP = '@media (min-width: ' + LARGE_BREAKPOINT + 'px)';
export const HUGE_AND_UP = '@media (min-width: 1240px)';
export const HAS_PHYSICAL_KEYBOARD =
  '@media (hover: hover) and (pointer: fine)';

export const colorTheme = (
  primary: string,
  darkMode: boolean
): CSSInterpolation => {
  const p = darkMode ? mix(primary, 'black', 0.5) : primary;
  const cellBG = darkMode ? '#6d6d6d' : 'white';
  const hover = darkMode ? 'white' : 'black';
  const hoverRatio = 0.1;
  const bg = darkMode ? '#121212' : '#fff';
  const secondary = darkMode ? '#444' : '#ccc';
  const reffed = mix(p, cellBG, 0.8);
  const error = adjustHue(p, 300);
  return {
    '--bg': bg,
    '--primary': p,
    '--lighter': darkMode ? p : mix(p, 'white', 0.5),
    '--reffed': reffed,
    '--secondary': secondary,
    '--bg-hover': mix(bg, hover, hoverRatio),
    '--secondary-hover': mix(secondary, hover, hoverRatio),
    '--reffed-hover': mix(reffed, hover, hoverRatio),
    '--boring-bg': darkMode ? '#b5b5b5' : '#555',
    '--boring-bg-hover': darkMode ? '#bbb' : '#5f5f5f',
    '--error': error,
    '--error-hover': mix(error, 'black', 0.3),
    '--notification-bg': '#de30e7',
    '--link': darkMode ? '#7fbdff' : '#2874a6',
    '--link-hover': darkMode ? '#8dc4ff' : '#21618c',
    '--text': darkMode ? '#d0d0d0' : '#212529',
    '--default-text': darkMode ? '#777' : '#999',
    '--caption': '#6c757d',
    '--black': darkMode ? '#eee' : 'black',
    '--verified': mix(adjustHue(p, 180), hover, darkMode ? 0.4 : 0.3),
    '--autofill': darkMode ? '#999' : '#bbb',
    '--top-bar-hover': 'rgba(0, 0, 0, 0.1)',
    '--shade-highlight': darkMode
      ? 'rgba(255, 255, 255, 0.3)'
      : 'rgba(0, 0, 0, 0.3)',
    '--overlay-bg': 'rgba(0, 0, 0, 0.85)',
    '--overlay-inner': darkMode ? '#151515' : 'white',
    '--conceal-text': darkMode ? 'white' : 'rgba(0, 0, 0, 0.7)',
    '--cell-bg': cellBG,
    '--cell-wall': 'black',
    '--white': darkMode ? '#000' : 'white',
    '--logo-white': darkMode ? '#d0d0d0' : 'white',
    '--key-bg': darkMode ? 'rgba(255, 255, 255, 0.15)' : 'white',
    '--key-ul': darkMode ? 'black' : '#b5b5b5',
    '--kb-bg': darkMode ? 'rgba(255, 255, 255, 0.1)' : '#ececec',
    '--kb-bg-click': darkMode ? 'black' : '#ddd',
    '--text-input-bg': darkMode ? '#333' : '#f5f5f5',
    '--text-input-border': darkMode ? '#000' : '#777',
    '--snackbar-bg': darkMode ? '#ddd' : '#121212',
    '--snackbar-text': darkMode ? 'black' : '#ddd',
    '--social-text': darkMode ? '#ddd' : '#fff',
  };
};
