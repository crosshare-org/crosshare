import { getPuzzlePageProps, PuzzlePageProps } from '../../../lib/serverOnly';
import { PuzzlePage } from '../../../components/PuzzlePage';
import { Global } from '@emotion/react';
import { colorTheme } from '../../../lib/style';
import { adjustHue } from 'color2k';
import { EmbedContext } from '../../../components/EmbedContext';

export const getServerSideProps = getPuzzlePageProps;

export default function ThemedPage(props: PuzzlePageProps) {
  return (
    <>
      <Global
        styles={{
          html: colorTheme(adjustHue('#eb984e', 300), true),
        }}
      />
      <EmbedContext.Provider value={true}>
        <PuzzlePage {...props} />
      </EmbedContext.Provider>
    </>
  );
}
