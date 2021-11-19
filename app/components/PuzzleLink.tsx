import { useState, useEffect, useContext, ReactNode } from 'react';

import { Link } from './Link';
import { AuthContext } from './AuthContext';
import { getPossiblyStalePlay } from '../lib/plays';
import { PuzzleResult } from '../lib/types';
import { SMALL_AND_UP } from '../lib/style';
import { PuzzleSizeIcon } from '../components/Icons';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { Emoji } from '../components/Emoji';
import { timeString } from '../lib/utils';
import { PlayWithoutUserT } from '../lib/dbtypes';
import { ConstructorPageT } from '../lib/constructorPage';
import { Markdown } from './Markdown';
import { Trans } from '@lingui/macro';
import { PastDistanceToNow, DistanceToNow } from './TimeDisplay';
import { FollowButton } from './FollowButton';

const PuzzleLink = (props: {
  fullWidth?: boolean;
  showingBlog: boolean;
  id: string;
  authorId: string;
  width?: number;
  height?: number;
  title: string;
  subTitle?: string;
  children?: ReactNode;
}) => {
  const { user } = useContext(AuthContext);
  const [play, setPlay] = useState<PlayWithoutUserT | null>(null);
  const authored = user?.uid === props.authorId;

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      const p = await getPossiblyStalePlay(user, props.id);
      if (ignore) {
        return;
      }
      setPlay(p);
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [user, props.id]);

  const linkCss = {
    color:
      authored || (play && play.f)
        ? 'var(--text)'
        : play
          ? 'var(--error)'
          : 'var(--link)',
    '&:hover': {
      color:
        authored || (play && play.f)
          ? 'var(--text)'
          : play
            ? 'var(--error-hover)'
            : 'var(--link-hover)',
    },
  };

  return (
    <div
      css={{
        marginBottom: props.showingBlog ? 0 : '1.5em',
        display: 'inline-flex',
        alignItems: 'flex-start',
        width: '100%',
        [SMALL_AND_UP]: {
          width: props.showingBlog || props.fullWidth ? '100%' : '50%',
        },
      }}
    >
      <Link
        css={[
          linkCss,
          {
            marginRight: '0.3em',
            fontSize: '4em',
            lineHeight: '1em',
          },
        ]}
        href={`/crosswords/${props.id}`}
      >
        <div css={{ position: 'relative' }}>
          <PuzzleSizeIcon width={props.width} height={props.height} />
          {authored || (play && play.f) ? (
            <div
              css={{
                textShadow:
                  '2px 0 0 white, -2px 0 0 white, 0 2px 0 white, 0 -2px 0 white',
                position: 'absolute',
                top: 0,
                width: '1.66em',
                textAlign: 'center',
                left: 0,
                fontSize: '0.6em',
              }}
            >
              {authored ? (
                <Emoji title="Authored Puzzle" symbol="🖋️" />
              ) : play && play.ch ? (
                <Emoji title="Used helpers" symbol="😏" />
              ) : (
                <Emoji title="Solved without helpers" symbol="🤓" />
              )}
            </div>
          ) : (
            ''
          )}
        </div>
      </Link>
      <div css={{ flex: 1 }}>
        <Link css={linkCss} href={`/crosswords/${props.id}`}>
          <h3
            css={{
              marginBottom: 0,
            }}
          >
            {props.title}{' '}
            {!authored && play ? (
              play.f ? (
                <i>({timeString(play.t, false)})</i>
              ) : (
                <i>(<Trans>unfinished</Trans>)</i>
              )
            ) : (
              ''
            )}
          </h3>
          {props.subTitle ? (
            <h4
              css={{
                marginBottom: 0,
              }}
            >
              {props.subTitle}
            </h4>
          ) : (
            ''
          )}
        </Link>
        {props.children}
      </div>
    </div>
  );
};

export const AuthorLink = ({
  authorName,
  constructorPage,
  guestConstructor,
  showFollowButton
}: {
  authorName: string;
  constructorPage: ConstructorPageT | null;
  guestConstructor: string | null;
  showFollowButton?: boolean;
}) => {
  let link: ReactNode = authorName;
  let followButton: ReactNode = <></>;
  if (constructorPage) {
    const username = constructorPage.i || constructorPage.id;
    link = <Link href={'/' + username}>{constructorPage.n}</Link>;
  }
  if (constructorPage && showFollowButton) {
    followButton = <FollowButton css={{ marginLeft: '0.5em', padding: '0.25em', fontSize: '0.9em', minWidth: '5.2em', boxShadow: 'none' }} page={constructorPage} />;
  }
  if (guestConstructor) {
    return (
      <>
        <Trans comment="The variable is the name of the puzzle's constructor">
          By {guestConstructor}
        </Trans>{' '}
        ·{' '}
        <Trans comment="The variable is the name of the user who published the puzzle">
          Published by {link}
        </Trans>
        {followButton}
      </>
    );
  }
  return (
    <>
      <Trans comment="The variable is the name of the puzzle's constructor">
        By {link}
      </Trans>
      {followButton}
    </>
  );
};

export type LinkablePuzzle = Pick<
  PuzzleResult,
  | 'title'
  | 'rating'
  | 'authorName'
  | 'guestConstructor'
  | 'isPrivateUntil'
  | 'publishTime'
  | 'isPrivate'
  | 'blogPost'
  | 'authorId'
  | 'id'
  | 'size'
>;

export function toLinkablePuzzle({
  title,
  rating,
  authorName,
  guestConstructor,
  isPrivateUntil,
  publishTime,
  isPrivate,
  blogPost,
  authorId,
  id,
  size,
}: LinkablePuzzle): LinkablePuzzle {
  return {
    title,
    rating,
    authorName,
    guestConstructor,
    isPrivate,
    isPrivateUntil,
    publishTime,
    blogPost,
    authorId,
    id,
    size,
  };
}

export const PuzzleResultLink = ({
  fullWidth,
  puzzle,
  showDate,
  showBlogPost,
  showAuthor,
  constructorPage,
  title,
  ...props
}: {
  fullWidth?: boolean;
  puzzle: LinkablePuzzle;
  showDate?: boolean;
  showBlogPost?: boolean;
  showPrivateStatus?: boolean;
  showAuthor: boolean;
  title?: string;
  constructorPage?: ConstructorPageT | null;
}) => {
  const difficulty = <DifficultyBadge puzzleRating={puzzle.rating} />;
  const authorLink = (
    <AuthorLink
      authorName={puzzle.authorName}
      guestConstructor={puzzle.guestConstructor}
      constructorPage={constructorPage || null}
    />
  );
  const publishDate = puzzle.isPrivateUntil
    ? new Date(puzzle.isPrivateUntil)
    : new Date(puzzle.publishTime);
  let date = (
    <span title={publishDate.toISOString()}>
      <Trans comment="The variable is a timestamp like '4 days ago' or 'hace 4 dias'">
        Published <PastDistanceToNow date={publishDate} />
      </Trans>
    </span>
  );
  if (props.showPrivateStatus) {
    if (puzzle.isPrivate) {
      date = (
        <span css={{ color: 'var(--error)' }} title={publishDate.toISOString()}>
          <Trans comment="The variable is a timestamp like '4 days ago' or 'hace 4 dias'">
            Published privately <PastDistanceToNow date={publishDate} />
          </Trans>
        </span>
      );
    } else if (
      puzzle.isPrivateUntil &&
      new Date(puzzle.isPrivateUntil) > new Date()
    ) {
      date = (
        <span css={{ color: 'var(--error)' }} title={publishDate.toISOString()}>
          <Trans comment="The variable is a timestamp like 'in 4 days' or 'en 4 dias'">
            Private, going public <DistanceToNow date={publishDate} />
          </Trans>
        </span>
      );
    }
  }
  let contents: ReactNode = difficulty;
  if (showDate && showAuthor) {
    contents = (
      <p>
        {difficulty} · {authorLink} · {date}
      </p>
    );
  } else if (puzzle.guestConstructor && showDate) {
    contents = (
      <p>
        {difficulty} ·{' '}
        <Trans
          id="guest-attrib"
          comment="The variable is the guest constructor's name"
        >
          By guest constructor {puzzle.guestConstructor}
        </Trans>{' '}
        · {date}
      </p>
    );
  } else if (showDate) {
    contents = (
      <p>
        {difficulty} · {date}
      </p>
    );
  } else if (showAuthor) {
    contents = (
      <p>
        {difficulty} · {authorLink}
      </p>
    );
  } else if (puzzle.guestConstructor) {
    contents = (
      <p>
        {difficulty} ·{' '}
        <Trans
          id="guest-attrib"
          comment="The variable is the guest constructor's name"
        >
          By guest constructor {puzzle.guestConstructor}
        </Trans>
      </p>
    );
  }
  return (
    <>
      <PuzzleLink
        fullWidth={fullWidth}
        showingBlog={showBlogPost && puzzle.blogPost ? true : false}
        authorId={puzzle.authorId}
        id={puzzle.id}
        width={puzzle.size.cols}
        height={puzzle.size.rows}
        title={title || puzzle.title}
        subTitle={title ? puzzle.title : undefined}
      >
        {contents}
      </PuzzleLink>
      {showBlogPost && puzzle.blogPost ? (
        <div css={{ width: '100%', marginBottom: '2em' }}>
          <Markdown text={puzzle.blogPost} preview={250} />
        </div>
      ) : (
        ''
      )}
    </>
  );
};
