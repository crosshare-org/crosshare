import Head from 'next/head';

export function FullscreenCSS() {
  return (
    <Head>
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
`,
        }}
      />
    </Head>
  );
}
