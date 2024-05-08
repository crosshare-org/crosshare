import Head from 'next/head';
import { ColorThemeProps, colorThemeString } from '../lib/style';

export interface EmbedStylingProps extends ColorThemeProps {
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
  return `@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("${encodeURI(url)}");
}`;
}

export function EmbedStyling(props: EmbedStylingProps) {
  const fontStyles: string[] = [];
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
  const colorTheme = colorThemeString(props);
  const reverseTheme = colorThemeString({
    ...props,
    darkMode: !props.darkMode,
  });
  return (
    <Head>
      <style
        key="theme"
        dangerouslySetInnerHTML={{
          __html: `
${fontStyles.join('\n')}
body {
  background-color: transparent !important;
}
html, body.light-mode, body.dark-mode {${colorTheme}}
.reverse-theme {${reverseTheme}}
`,
        }}
      />
    </Head>
  );
}
