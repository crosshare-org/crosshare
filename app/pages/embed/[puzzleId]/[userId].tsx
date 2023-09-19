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
import { useCallback, useState } from 'react';
import useEventListener from '@use-it/event-listener';

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

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!params?.userId || Array.isArray(params.userId)) {
    return props;
  }

  const embedOptionsRes = await getCollection('em').doc(params.userId).get();
  let embedOptions = validate(embedOptionsRes.data());
  if (!embedOptions) {
    embedOptions = {};
  }
  if (rest.query['color-mode'] === 'dark') {
    embedOptions.d = true;
  }
  if (rest.query['color-mode'] === 'light') {
    embedOptions.d = false;
  }
  return { ...props, props: { ...props.props, embedOptions } };
};

export const getServerSideProps = withTranslation(gssp);

type Message = {
  type: string;
  value: string;
}

export default function ThemedPage(props: PuzzlePageProps) {
  let primary = PRIMARY;
  let link = LINK;
  let preservePrimary = false;

  const [darkMode, setDarkMode] = useState('embedOptions' in props && props.embedOptions?.d || false);

  if ('embedOptions' in props) {
    primary = props.embedOptions?.p || PRIMARY;
    link = props.embedOptions?.l || LINK;
    preservePrimary = props.embedOptions?.pp || false;
    // Just ensure color is parseable, this'll throw if not:
    parseToRgba(primary);
  }

  const handleMessage = useCallback((e: MessageEvent) => {
    const message: Message = e.data;

    if (message.type === 'set-color-mode') {
      setDarkMode(message.value === 'dark');
    }
  }, []);
  useEventListener('message', handleMessage);

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
