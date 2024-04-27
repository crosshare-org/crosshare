import {
  adjustHue,
  darken,
  hasBadContrast,
  lighten,
  mix,
  readableColorIsBlack,
} from 'color2k';
import { EmbedStylingProps } from '../components/EmbedStyling';

export const KEYBOARD_HEIGHT = 164;
export const PROFILE_PIC: [number, number] = [200, 200];
export const COVER_PIC: [number, number] = [1200, 400];

// make any changes in concert w/ definitions.module.css
export const HEADER_HEIGHT = 35;
export const TINY_COL_MIN_HEIGHT = 50;
export const SQUARE_HEADER_HEIGHT = 68;
export const MAX_WIDTH = 1200;
export const SMALL_BREAKPOINT = 576;
export const LARGE_BREAKPOINT = 992;
export const HUGE_BREAKPOINT = 1240;
// ^

export const SMALL_AND_UP_RULES = '(min-width: ' + SMALL_BREAKPOINT + 'px)';
export const SMALL_AND_UP = '@media ' + SMALL_AND_UP_RULES;
export const LARGE_AND_UP = '@media (min-width: ' + LARGE_BREAKPOINT + 'px)';
export const HUGE_AND_UP = `@media (min-width: ${HUGE_BREAKPOINT}px)`;
export const HAS_PHYSICAL_KEYBOARD =
  '@media (hover: hover) and (pointer: fine)';

export const PRIMARY = '#eb984e';
export const LINK = '#2874a6';
export const ERROR_COLOR = adjustHue(PRIMARY, 280);
export const VERIFIED_COLOR = mix(adjustHue(PRIMARY, 180), 'black', 0.3);

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

const makeReadable = (background: string, color: string) => {
  let modify;
  if (readableColorIsBlack(background)) {
    modify = darken;
  } else {
    modify = lighten;
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
  for (let i = 0; i < 10; i += 1) {
    if (!hasBadContrast(color, 'aa', background)) {
      return color;
    }
    color = modify(color, 0.1);
  }
  return color;
};

export const colorTheme = ({
  primary,
  link,
  errorColor,
  verifiedColor,
  darkMode,
  preservePrimary,
}: EmbedStylingProps): Record<string, string> => {
  const p = darkMode && !preservePrimary ? mix(primary, 'black', 0.5) : primary;
  const l = darkMode && !preservePrimary ? mix(link, 'white', 0.5) : link;
  const error =
    darkMode && !preservePrimary ? mix(errorColor, 'white', 0.3) : errorColor;
  const verified =
    darkMode && !preservePrimary
      ? mix(verifiedColor, 'white', 0.4)
      : verifiedColor;

  const cellBG = darkMode ? '#353535' : 'white';
  const hover = darkMode ? 'white' : 'black';
  const hoverRatio = 0.1;
  const bg = darkMode ? '#222' : '#fff';
  const linkLightBG = mix(link, bg, 0.9);
  const linkLightBGHover = mix(link, bg, 0.8);
  const text = darkMode ? DARK_MODE_WHITE : 'black';
  const secondary = darkMode ? '#505050' : '#ccc';
  const lighter = mix(p, cellBG, 0.6);
  const selectedCell = darkMode ? '#a880ff' : '#c484ff';

  return {
    '--tag-l': darkMode ? '30%' : '85%',
    '--bg': bg,
    '--primary': p,
    '--readable-primary': makeReadable(bg, p),
    '--blue': darkMode ? mix('blue', 'white', 0.5) : 'blue',
    '--green': darkMode ? mix('green', 'white', 0.5) : 'green',
    '--onprimary': readableColor(p, darkMode),
    '--lighter': lighter,
    '--on-lighter': readableColor(lighter, darkMode),
    '--secondary': secondary,
    '--on-secondary': readableColor(secondary, darkMode),
    '--selected-cell': selectedCell,
    '--on-selected-cell': readableColor(selectedCell, darkMode),
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
    '--verified-on-primary': makeReadable(p, verified),
    '--verified-on-lighter': makeReadable(lighter, verified),
    '--verified-on-bg': makeReadable(cellBG, verified),
    '--verified-on-secondary': makeReadable(secondary, verified),
    '--verified-on-selected-cell': makeReadable(selectedCell, verified),
    '--autofill': darkMode ? '#999' : '#bbb',
    '--top-bar-hover': 'rgba(0, 0, 0, 0.1)',
    '--shade-highlight': darkMode
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.3)',
    '--overlay-bg': 'rgba(0, 0, 0, 0.85)',
    '--overlay-inner': darkMode ? '#252525' : 'white',
    '--overlay-stroke': 'black',
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
    '--text-input-border-disabled': darkMode ? '#333' : '#BBB',
    '--snackbar-bg': darkMode ? '#ddd' : '#121212',
    '--snackbar-text': darkMode ? 'black' : '#ddd',
    '--social-text': darkMode ? '#ddd' : '#fff',
  };
};

export const styleObjectToString = (obj: Record<string, string>): string => {
  return (
    Object.entries(obj)
      .map(([k, v]) => `${k}:${v}`)
      .join(';') + ';'
  );
};

export const colorThemeString = (props: EmbedStylingProps): string => {
  return styleObjectToString(colorTheme(props));
};
