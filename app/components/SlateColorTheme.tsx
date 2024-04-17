import { useContext } from 'react';
import { EmbedColorMode, EmbedContext } from './EmbedContext';
import { darken, lighten, mix } from 'color2k';
import { styleObjectToString } from '../lib/style';
import Head from 'next/head';

export const SlateColorTheme = () => {
  const { isSlate, colorMode, primaryColor, preservePrimary } =
    useContext(EmbedContext);

  const darkMode = colorMode === EmbedColorMode.Dark;

  const p =
    darkMode && !preservePrimary
      ? mix(primaryColor, 'black', 0.5)
      : primaryColor;

  if (!isSlate) {
    return <></>;
  }

  return (
    <Head>
      <style
        dangerouslySetInnerHTML={{
          __html: `html, body.light-mode, body.dark-mode {${styleObjectToString(
            {
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
              '--overlay-inner': darkMode ? '#2C0022' : 'white',
              '--overlay-stroke': darkMode ? '#80667A' : 'black',
              '--slate-primary-hover': darkMode
                ? darken(p, 0.1)
                : lighten(p, 0.1),
            }
          )}}`,
        }}
      />
    </Head>
  );
};
