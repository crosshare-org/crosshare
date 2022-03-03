import { getPuzzlePageProps, PuzzlePageProps } from '../../../lib/serverOnly';
import { PuzzlePage } from '../../../components/PuzzlePage';
import { Global } from '@emotion/react';
import { colorTheme, LINK, PRIMARY } from '../../../lib/style';
import { parseToRgba } from 'color2k';
import { EmbedContext } from '../../../components/EmbedContext';
import { GetServerSideProps } from 'next';
import { validate } from '../../../lib/embedOptions';
import { withTranslation } from '../../../lib/translation';
import { getCollection } from '../../../lib/firebaseAdminWrapper';

export const gssp: GetServerSideProps<PuzzlePageProps> = async ({
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

  if (!params?.userId || Array.isArray(params.userId)) {
    return props;
  }

  const embedOptionsRes = await getCollection('em').doc(params.userId).get();
  if (!embedOptionsRes.exists) {
    return props;
  }
  const embedOptions = validate(embedOptionsRes.data());
  if (!embedOptions) {
    return props;
  }
  return { ...props, props: { ...props.props, embedOptions } };
};

export const getServerSideProps = withTranslation(gssp);

export default function ThemedPage(props: PuzzlePageProps) {
  let primary = PRIMARY;
  let link = LINK;
  let darkMode = false;
  let preservePrimary = false;
  if ('embedOptions' in props) {
    primary = props.embedOptions?.p || PRIMARY;
    link = props.embedOptions?.l || LINK;
    darkMode = props.embedOptions?.d || false;
    preservePrimary = props.embedOptions?.pp || false;
    // Just ensure color is parseable, this'll throw if not:
    parseToRgba(primary);
  }

  return (
    <>
      <Global
        styles={{
          body: {
            backgroundColor: 'transparent !important',
          },
          'html, body.light-mode, body.dark-mode': colorTheme(
            primary,
            link,
            darkMode,
            preservePrimary
          ),
        }}
      />
      <EmbedContext.Provider value={true}>
        <PuzzlePage {...props} />
      </EmbedContext.Provider>
    </>
  );
}
