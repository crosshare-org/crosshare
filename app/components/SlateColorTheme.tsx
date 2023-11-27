import { useContext } from 'react';
import { EmbedColorMode, EmbedContext } from './EmbedContext';
import { Global } from '@emotion/react';
import { darken } from 'color2k';

const colorTheme = (darkMode: boolean) => {
  return {
    '--bg': darkMode ? 'red' : '#F8F8F8',
    '--slate-container-border': darkMode ? 'red' : '#E9E6EA',
    '--slate-title': darkMode ? 'red' : '#222222',
    '--slate-subtitle': darkMode ? 'red' : '#666',
    '--slate-button-text': darkMode ? 'red' : '#000',
    '--slate-button-bg': darkMode ? 'red' : '#F0F0F0',
    '--slate-button-bg-hover': darkMode ? 'red' : darken('#F0F0F0', 0.1),
    '--slate-button-border': darkMode ? 'red' : '#DDD',
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
