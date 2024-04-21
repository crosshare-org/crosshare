import { GetServerSideProps } from 'next';
import { EmbedContext } from '../../../components/EmbedContext';
import { EmbedStyling } from '../../../components/EmbedStyling';
import { PuzzlePage } from '../../../components/PuzzlePage';
import { useEmbedOptions } from '../../../lib/hooks';
import {
  getEmbedProps,
  getPuzzlePageProps,
  PuzzlePageProps,
} from '../../../lib/serverOnly';
import { withTranslation } from '../../../lib/translation';

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
  return { ...props, props: { ...(await props.props), embedOptions } };
};

export const getServerSideProps = withTranslation(gssp);

export default function ThemedPage(props: PuzzlePageProps) {
  const [embedStyleProps, embedContext] = useEmbedOptions(
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    ('embedOptions' in props && props.embedOptions) || undefined
  );

  return (
    <>
      <EmbedStyling {...embedStyleProps} />
      <EmbedContext.Provider value={embedContext}>
        <PuzzlePage {...props} />
      </EmbedContext.Provider>
    </>
  );
}
