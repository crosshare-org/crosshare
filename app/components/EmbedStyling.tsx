import { Global } from '@emotion/react';
import { colorTheme } from '../lib/style';

export interface EmbedStylingProps {
  primary: string;
  link: string;
  darkMode: boolean;
  preservePrimary: boolean;
  fontUrl?: string;
}

export function EmbedStyling(props: EmbedStylingProps) {
  return (
    <Global
      styles={{
        ...(props.fontUrl && {
          '@font-face': {
            fontFamily: 'CrosshareCustom',
            fontStyle: 'normal',
            fontWeight: 400,
            fontDisplay: 'swap',
            src: `url(${encodeURI(props.fontUrl)})`,
          },
        }),
        body: {
          backgroundColor: 'transparent !important',
        },
        'html, body.light-mode, body.dark-mode': colorTheme(props),
      }}
    />
  );
}
