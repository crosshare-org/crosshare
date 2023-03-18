import { PageErrorProps } from '../../../../lib/serverOnly';
import { Global } from '@emotion/react';
import { colorTheme, LINK, PRIMARY } from '../../../../lib/style';
import { parseToRgba } from 'color2k';
import { EmbedContext } from '../../../../components/EmbedContext';
import { GetServerSideProps } from 'next';
import { EmbedOptionsT, validate } from '../../../../lib/embedOptions';
import {
  LinkablePuzzle,
  PuzzleResultLink,
} from '../../../../components/PuzzleLink';
import { getCollection } from '../../../../lib/firebaseAdminWrapper';
import { withTranslation } from '../../../../lib/translation';
import { paginatedPuzzles } from '../../../../lib/paginatedPuzzles';
import { ErrorPage } from '../../../../components/ErrorPage';
import { Link } from '../../../../components/Link';

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

export default function ThemedPage(props: PageProps | PageErrorProps) {
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
        <div css={{ padding: '1em', backgroundColor: 'var(--bg)' }}>
          {props.puzzles.map((p, i) => (
            <PuzzleResultLink
              noTargetBlank={true}
              fromEmbedPage={props.currentPage}
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
                  href={`/embed/list/${props.userId}`}
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
                  href={`/embed/list/${props.userId}/${props.prevPage}`}
                  noTargetBlank={true}
                >
                  ← Newer Puzzles
                </Link>
              ) : (
                ''
              )}
              {props.nextPage !== null ? (
                <Link
                  href={`/embed/list/${props.userId}/${props.nextPage}`}
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
