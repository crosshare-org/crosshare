import { Trans } from '@lingui/macro';
import type { Root } from 'hast';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { ConstructorPageBase } from '../lib/constructorPage';
import { PlayWithoutUserT } from '../lib/dbtypes';
import { markdownToHast } from '../lib/markdown/markdown';
import { getPossiblyStalePlay } from '../lib/plays';
import { PuzzleResult } from '../lib/types';
import { clsx, logAsyncErrors, slugify, timeString } from '../lib/utils';
import { AuthContext } from './AuthContext';
import { Emoji } from './Emoji';
import { FollowButton } from './FollowButton';
import { PatronIcon, PuzzleSizeIcon } from './Icons';
import { Link } from './Link';
import { Markdown } from './Markdown';
import styles from './PuzzleLink.module.css';
import { TagList } from './TagList';
import { DistanceToNow, PastDistanceToNow } from './TimeDisplay';

const PuzzleLink = (props: {
  fullWidth?: boolean;
  showingBlog: boolean;
  id: string;
  puzzleTitle: string;
  authorId: string;
  width?: number;
  height?: number;
  title: string;
  subTitle?: string;
  children?: ReactNode;
  tags: string[];
  filterTags: string[];
  noTargetBlank?: boolean;
  fromEmbedPage?: number;
  addQueryString?: string;
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
    logAsyncErrors(fetchData)();
    return () => {
      ignore = true;
    };
  }, [user, props.id]);

  const filteredTags = props.tags.filter(
    (t) =>
      ![
        'featured',
        'dailymini',
        'mini',
        'midi',
        'full',
        'jumbo',
        'rating-0-1200',
        'rating-1200-1500',
        'rating-1500-1800',
        'rating-1800-up',
      ]
        .concat(props.filterTags)
        .includes(t)
  );

  const url =
    props.fromEmbedPage !== undefined
      ? `/embed/${props.id}/${props.authorId}?backToListPage=${
          props.fromEmbedPage
        }${props.addQueryString ? '&' + props.addQueryString : ''}`
      : `/crosswords/${props.id}/${slugify(props.puzzleTitle)}`;
  return (
    <div
      data-completed={authored || play?.f}
      data-started={Boolean(play)}
      data-showing-blog={props.showingBlog}
      data-full-width={props.fullWidth}
      className={styles.link}
    >
      <Link
        noTargetBlank={props.noTargetBlank}
        className={clsx(styles.linkColor, styles.icon)}
        href={url}
      >
        <div className="positionRelative">
          <PuzzleSizeIcon width={props.width} height={props.height} />
          {authored || (play && play.f) ? (
            <div className={styles.emoji}>
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
      <div className="flex1">
        <Link
          noTargetBlank={props.noTargetBlank}
          className={styles.linkColor}
          href={url}
        >
          <h3 className="marginBottom0">
            {props.title}{' '}
            {!authored && play ? (
              play.f ? (
                <i>({timeString(play.t, false)})</i>
              ) : (
                <i>
                  (<Trans>unfinished</Trans>)
                </i>
              )
            ) : (
              ''
            )}
          </h3>
          {props.subTitle ? (
            <h4 className="marginBottom0">{props.subTitle}</h4>
          ) : (
            ''
          )}
        </Link>
        {props.children}
        {filteredTags.length ? (
          <TagList className={styles.taglist} tags={filteredTags} link />
        ) : (
          ''
        )}
      </div>
    </div>
  );
};

export const AuthorLink = ({
  authorName,
  constructorPage,
  guestConstructor,
  showFollowButton,
  isPatron,
}: {
  authorName: string;
  constructorPage: ConstructorPageBase | null;
  guestConstructor: string | null;
  showFollowButton?: boolean;
  isPatron: boolean;
}) => {
  let link: ReactNode = authorName;
  let followButton: ReactNode = <></>;
  if (constructorPage) {
    const username = constructorPage.i || constructorPage.id;
    link = <Link href={'/' + username}>{constructorPage.n}</Link>;
  }
  if (constructorPage && showFollowButton) {
    followButton = (
      <>
        {' '}
        <FollowButton className={styles.follow} page={constructorPage} />
      </>
    );
  }
  if (isPatron) {
    link = (
      <>
        <PatronIcon linkIt={true} /> {link}
      </>
    );
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
  | 'userTags'
  | 'autoTags'
> & { blogPostPreview: Root | null };

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
  userTags,
  autoTags,
}: Omit<LinkablePuzzle, 'blogPostPreview'>): LinkablePuzzle {
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
    userTags,
    autoTags,
    blogPostPreview: blogPost
      ? markdownToHast({ text: blogPost, preview: 250 })
      : null,
  };
}

export const PuzzleResultLink = ({
  fullWidth,
  puzzle,
  showDate,
  showBlogPost,
  showAuthor,
  constructorPage,
  constructorIsPatron,
  title,
  noTargetBlank,
  fromEmbedPage,
  addQueryString,
  ...props
}: {
  fullWidth?: boolean;
  puzzle: LinkablePuzzle;
  showDate?: boolean;
  showBlogPost?: boolean;
  showPrivateStatus?: boolean;
  showAuthor: boolean;
  title?: string;
  constructorPage?: ConstructorPageBase | null;
  constructorIsPatron: boolean;
  filterTags: string[];
  noTargetBlank?: boolean;
  fromEmbedPage?: number;
  addQueryString?: string;
}) => {
  const difficulty = <DifficultyBadge puzzleRating={puzzle.rating} />;
  const authorLink = (
    <AuthorLink
      authorName={puzzle.authorName}
      guestConstructor={puzzle.guestConstructor}
      constructorPage={constructorPage ?? null}
      isPatron={constructorIsPatron}
    />
  );
  const publishDate = puzzle.isPrivateUntil
    ? new Date(puzzle.isPrivateUntil)
    : new Date(puzzle.publishTime);
  let date = (
    <Trans comment="The variable is a timestamp like '4 days ago' or 'hace 4 dias'">
      Published <PastDistanceToNow date={publishDate} />
    </Trans>
  );
  if (props.showPrivateStatus) {
    if (puzzle.isPrivate !== false) {
      date = (
        <span className="colorError">
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
        <span className="colorError">
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
        <Trans comment="The variable is the guest constructor's name">
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
        <Trans comment="The variable is the guest constructor's name">
          By guest constructor {puzzle.guestConstructor}
        </Trans>
      </p>
    );
  }
  return (
    <>
      <PuzzleLink
        fullWidth={fullWidth}
        showingBlog={showBlogPost && puzzle.blogPostPreview ? true : false}
        authorId={puzzle.authorId}
        id={puzzle.id}
        puzzleTitle={puzzle.title}
        width={puzzle.size.cols}
        height={puzzle.size.rows}
        title={title ?? puzzle.title}
        subTitle={title ? puzzle.title : undefined}
        tags={(puzzle.userTags ?? []).concat(puzzle.autoTags ?? [])}
        filterTags={props.filterTags}
        noTargetBlank={noTargetBlank}
        fromEmbedPage={fromEmbedPage}
        addQueryString={addQueryString}
      >
        {contents}
      </PuzzleLink>
      {showBlogPost && puzzle.blogPostPreview ? (
        <div className={styles.blog}>
          <Markdown hast={puzzle.blogPostPreview} />
        </div>
      ) : (
        ''
      )}
    </>
  );
};
