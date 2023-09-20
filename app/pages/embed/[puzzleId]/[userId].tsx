import {
  getEmbedProps,
  getPuzzlePageProps,
  PuzzlePageProps,
} from '../../../lib/serverOnly';
import { PuzzlePage } from '../../../components/PuzzlePage';
import { Global } from '@emotion/react';
import { colorTheme } from '../../../lib/style';
import { EmbedContext } from '../../../components/EmbedContext';
import { GetServerSideProps } from 'next';
import { withTranslation } from '../../../lib/translation';
import { useColorThemeForEmbed } from '../../../lib/hooks';

const gssp: GetServerSideProps<PuzzlePageProps> = async ({
  params,
  ...rest
}) => {
  if (params) {
    params.ignoreRedirect = 'true';
  }
  const props = await getPuzzlePageProps({ params, ...rest });
  if (!('props' in props)) {
    return props;
  }

  const embedOptions = await getEmbedProps({ params, ...rest });
  return { ...props, props: { ...props.props, embedOptions } };
};

export const getServerSideProps = withTranslation(gssp);

export default function ThemedPage(props: PuzzlePageProps) {
  const colorThemeProps = useColorThemeForEmbed(
    ('embedOptions' in props && props.embedOptions) || undefined
  );

  return (
    <>
      <Global
        styles={{
          body: {
            backgroundColor: 'transparent !important',
          },
          'html, body.light-mode, body.dark-mode': colorTheme(colorThemeProps),
        }}
      />
      <EmbedContext.Provider value={true}>
        <PuzzlePage {...props} />
      </EmbedContext.Provider>
    </>
  );
}
