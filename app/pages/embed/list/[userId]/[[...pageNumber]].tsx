import { getEmbedProps, PageErrorProps } from '../../../../lib/serverOnly';
import { Global } from '@emotion/react';
import { colorTheme } from '../../../../lib/style';
import {
  EmbedColorMode,
  EmbedContext,
} from '../../../../components/EmbedContext';
import { GetServerSideProps } from 'next';
import { EmbedOptionsT } from '../../../../lib/embedOptions';
import {
  LinkablePuzzle,
  PuzzleResultLink,
} from '../../../../components/PuzzleLink';
import { withTranslation } from '../../../../lib/translation';
import { paginatedPuzzles } from '../../../../lib/paginatedPuzzles';
import { ErrorPage } from '../../../../components/ErrorPage';
import { Link } from '../../../../components/Link';
import { useEmbedOptions } from '../../../../lib/hooks';

interface PageProps {
  userId: string;
  puzzles: Array<LinkablePuzzle>;
  nextPage: number | null;
  currentPage: number;
  prevPage: number | null;
  embedOptions?: EmbedOptionsT;
}

const gssp: GetServerSideProps<PageProps | PageErrorProps> = async ({
  params,
  query,
}) => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!params?.userId || Array.isArray(params.userId)) {
    return { props: { error: 'No userId supplied' } };
  }

  const pn = params?.pageNumber;
  let page: number;
  if (pn === undefined) {
    page = 0;
  } else if (Array.isArray(pn) && pn.length === 1 && pn[0]) {
    page = parseInt(pn[0]);
    if (page.toString() !== pn[0] || page < 0) {
      return { props: { error: 'Bad page number' } };
    }
  } else {
    return { props: { error: 'Bad page number' } };
  }

  const [puzzles, hasNext] = await paginatedPuzzles(
    page,
    10,
    'a',
    params.userId
  );

  const props = {
    props: {
      userId: params.userId,
      puzzles,
      currentPage: page,
      prevPage: page > 0 ? page - 1 : null,
      nextPage: hasNext ? page + 1 : null,
    },
  };

  const embedOptions = await getEmbedProps({ params, query });

  return { ...props, props: { ...props.props, embedOptions } };
};

export const getServerSideProps = withTranslation(gssp);

export default function ThemedPage(props: PageProps | PageErrorProps) {
  const [colorThemeProps, embedContext] = useEmbedOptions(
    ('embedOptions' in props && props.embedOptions) || undefined
  );

  if ('error' in props) {
    return (
      <ErrorPage title="Error loading list">
        <p>We&apos;re sorry, there was an error.</p>
        <p>{props.error}</p>
        <p>
          Try the <Link href="/">homepage</Link>.
        </p>
      </ErrorPage>
    );
  }

  let colorModeQuery = '';
  if (embedContext.colorMode !== EmbedColorMode.Default) {
    if (embedContext.colorMode === EmbedColorMode.Light) {
      colorModeQuery = 'color-mode=light';
    } else {
      colorModeQuery = 'color-mode=dark';
    }
  }

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
      <EmbedContext.Provider value={embedContext}>
        <div css={{ padding: '1em', backgroundColor: 'var(--bg)' }}>
          {props.puzzles.map((p, i) => (
            <PuzzleResultLink
              noTargetBlank={true}
              fromEmbedPage={props.currentPage}
              addQueryString={colorModeQuery}
              fullWidth={true}
              key={i}
              puzzle={p}
              showDate={true}
              showBlogPost={true}
              showAuthor={false}
              constructorIsPatron={false}
              filterTags={[]}
            />
          ))}
          {props.nextPage || props.prevPage !== null ? (
            <p css={{ textAlign: 'center' }}>
              {props.prevPage === 0 ? (
                <Link
                  css={{ marginRight: '2em' }}
                  href={`/embed/list/${props.userId}${
                    colorModeQuery ? '?' + colorModeQuery : ''
                  }`}
                  noTargetBlank={true}
                >
                  ← Newer Puzzles
                </Link>
              ) : (
                ''
              )}
              {props.prevPage ? (
                <Link
                  css={{ marginRight: '2em' }}
                  href={`/embed/list/${props.userId}/${props.prevPage}${
                    colorModeQuery ? '?' + colorModeQuery : ''
                  }`}
                  noTargetBlank={true}
                >
                  ← Newer Puzzles
                </Link>
              ) : (
                ''
              )}
              {props.nextPage !== null ? (
                <Link
                  href={`/embed/list/${props.userId}/${props.nextPage}${
                    colorModeQuery ? '?' + colorModeQuery : ''
                  }`}
                  noTargetBlank={true}
                >
                  Older Puzzles →
                </Link>
              ) : (
                ''
              )}
            </p>
          ) : (
            ''
          )}
        </div>
      </EmbedContext.Provider>
    </>
  );
}
