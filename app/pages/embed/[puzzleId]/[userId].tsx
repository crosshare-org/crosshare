import { getPuzzlePageProps, PuzzlePageProps } from '../../../lib/serverOnly';
import { PuzzlePage } from '../../../components/PuzzlePage';
import { Global } from '@emotion/react';
import { colorTheme } from '../../../lib/style';
import { adjustHue } from 'color2k';

export const getServerSideProps = getPuzzlePageProps;

export default function ThemedPage(props: PuzzlePageProps) {
  return (
    <>
      <Global
        styles={{
          html: colorTheme(adjustHue('#eb984e', 0), true),
        }}
      />
      <PuzzlePage {...props} />
    </>
  );
}
