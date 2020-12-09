import { getPuzzlePageProps, PuzzlePageProps } from '../../../lib/serverOnly';
import { PuzzlePage } from '../../../components/PuzzlePage';
import { Global } from '@emotion/react';
import { colorTheme } from '../../../lib/style';

export const getServerSideProps = getPuzzlePageProps;

export default function ThemedPage(props: PuzzlePageProps) {
  return (
    <>
      <Global
        styles={{
          html: colorTheme('purple', true),
        }}
      />
      <PuzzlePage {...props} />
    </>
  );
}
