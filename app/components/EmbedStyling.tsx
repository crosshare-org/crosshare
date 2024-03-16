import { Global, css } from '@emotion/react';
import { colorTheme } from '../lib/style';
import type { CSSInterpolation } from '@emotion/serialize';

export interface EmbedStylingProps {
  primary: string;
  link: string;
  errorColor: string;
  verifiedColor: string;
  darkMode: boolean;
  preservePrimary: boolean;
  fontUrl?: string;
  fontUrlBold?: string;
  fontUrlItalic?: string;
  fontUrlBoldItalic?: string;
}

export function fontFace(
  url: string,
  family: string,
  style: 'normal' | 'italic',
  weight: 'normal' | 'bold'
) {
  return {
    '@font-face': {
      fontFamily: family,
      fontStyle: style,
      fontWeight: weight,
      fontDisplay: 'swap',
      src: `url(${encodeURI(url)})`,
    },
  };
}

export function EmbedStyling(props: EmbedStylingProps) {
  const fontStyles: CSSInterpolation[] = [];
  if (props.fontUrl) {
    fontStyles.push(
      fontFace(props.fontUrl, 'CrosshareCustom', 'normal', 'normal')
    );
    if (props.fontUrlBold) {
      fontStyles.push(
        fontFace(props.fontUrlBold, 'CrosshareCustom', 'normal', 'bold')
      );
    }
    if (props.fontUrlItalic) {
      fontStyles.push(
        fontFace(props.fontUrlItalic, 'CrosshareCustom', 'italic', 'normal')
      );
    }
    if (props.fontUrlBoldItalic) {
      fontStyles.push(
        fontFace(props.fontUrlBoldItalic, 'CrosshareCustom', 'italic', 'bold')
      );
    }
  }
  return (
    <Global
      styles={css([
        fontStyles,
        {
          body: {
            backgroundColor: 'transparent !important',
          },
          'html, body.light-mode, body.dark-mode': colorTheme(props),
        },
      ])}
    />
  );
}
