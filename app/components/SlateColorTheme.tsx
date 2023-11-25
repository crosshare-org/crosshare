import { useContext } from 'react';
import { EmbedColorMode, EmbedContext } from './EmbedContext';
import { Global } from '@emotion/react';

const colorTheme = (darkMode: boolean) => {
  return {
    '--bg': darkMode ? 'red' : '#F8F8F8',
    '--slate-container-border': darkMode ? 'red' : '#E9E6EA',
    '--slate-title': darkMode ? 'red' : '#222222',
    '--slate-subtitle': darkMode ? 'red' : '#666',
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
