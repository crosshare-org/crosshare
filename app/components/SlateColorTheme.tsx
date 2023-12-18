import { useContext } from 'react';
import { EmbedColorMode, EmbedContext } from './EmbedContext';
import { Global } from '@emotion/react';
import { darken, lighten } from 'color2k';

const colorTheme = (darkMode: boolean) => {
  return {
    '--dark-image-display': darkMode ? 'block' : 'none',
    '--light-image-display': darkMode ? 'none' : 'block',
    '--bg': darkMode ? '#2C0022' : '#F8F8F8',
    '--slate-container-border': darkMode ? '#80667A' : '#E9E6EA',
    '--slate-title': darkMode ? '#F8F8F8' : '#222222',
    '--slate-subtitle': darkMode ? '#DDDDDD' : '#666',
    '--slate-button-text': darkMode ? '#ffffff' : '#000',
    '--slate-button-bg': darkMode ? '#4C2643' : '#F0F0F0',
    '--slate-button-bg-hover': darkMode
      ? lighten('#4C2643', 0.1)
      : darken('#F0F0F0', 0.1),
    '--slate-button-border': darkMode ? '#56334E' : '#DDD',
  };
};

export const SlateColorTheme = () => {
  const { isSlate, colorMode } = useContext(EmbedContext);

  if (!isSlate) {
    return <></>;
  }

  return (
    <Global
      styles={{
        'html, body.light-mode, body.dark-mode': colorTheme(
          colorMode === EmbedColorMode.Dark
        ),
      }}
    />
  );
};
