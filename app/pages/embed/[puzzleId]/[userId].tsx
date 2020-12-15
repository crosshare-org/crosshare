import { getPuzzlePageProps, PuzzlePageProps } from '../../../lib/serverOnly';
import { PuzzlePage } from '../../../components/PuzzlePage';
import { Global } from '@emotion/react';
import { colorTheme, PRIMARY } from '../../../lib/style';
import { parseToRgba } from 'color2k';
import { EmbedContext } from '../../../components/EmbedContext';
import { GetServerSideProps } from 'next';
import { App } from '../../../lib/firebaseWrapper';
import { validate } from '../../../lib/embedOptions';

export const getServerSideProps: GetServerSideProps<PuzzlePageProps> = async ({
  params,
  ...rest
}) => {
  const props = await getPuzzlePageProps({ params, ...rest });
  if (!('props' in props)) {
    return props;
  }

  if (!params?.userId || Array.isArray(params.userId)) {
    return props;
  }

  const embedOptionsRes = await App.firestore()
    .doc(`em/${params.userId}`)
    .get();
  if (!embedOptionsRes.exists) {
    return props;
  }
  const embedOptions = validate(embedOptionsRes.data());
  if (!embedOptions) {
    return props;
  }
  return { ...props, props: { ...props.props, embedOptions } };
};

export default function ThemedPage(props: PuzzlePageProps) {
  let primary = PRIMARY;
  let darkMode = false;
  if ('embedOptions' in props) {
    primary = props.embedOptions?.p || PRIMARY;
    darkMode = props.embedOptions?.d || false;
    // Just ensure color is parseable, this'll throw if not:
    parseToRgba(primary);
  }

  return (
    <>
      <Global
        styles={{
          html: colorTheme(primary, darkMode),
        }}
      />
      <EmbedContext.Provider value={true}>
        <PuzzlePage {...props} />
      </EmbedContext.Provider>
    </>
  );
}
