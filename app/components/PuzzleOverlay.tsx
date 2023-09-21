import { useContext, useState, useEffect, Dispatch, ReactNode } from 'react';
import { Link } from './Link';
import { Direction, PuzzleResultWithAugmentedComments } from '../lib/types';
import { PuzzleAction } from '../reducers/reducer';
import { isMetaSolution, slugify, timeString } from '../lib/utils';
import type { User } from 'firebase/auth';
import { Comments } from './Comments';
import { EmbedColorMode, EmbedContext } from './EmbedContext';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { NextPuzzleLink } from './Puzzle';
import { Overlay } from './Overlay';
import { PuzzleHeading } from './PuzzleHeading';
import { Button, ButtonAsLink } from './Buttons';
import { MetaSubmission } from './MetaSubmission';
import { lightFormat } from 'date-fns';
import { GoScreenFull } from 'react-icons/go';
import { AuthContext } from './AuthContext';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { t, Trans } from '@lingui/macro';
import { useRouter } from 'next/router';
import { SharingButtons } from './SharingButtons';

const PrevDailyMiniLink = ({ nextPuzzle }: { nextPuzzle?: NextPuzzleLink }) => {
  if (!nextPuzzle) {
    return <></>;
  }
  return (
    <Link
      href={`/crosswords/${nextPuzzle.puzzleId}/${slugify(
        nextPuzzle.puzzleTitle
      )}`}
    >
      Play {nextPuzzle.linkText}
    </Link>
  );
};

export enum OverlayType {
  BeginPause,
  Success,
}

export interface PuzzleOverlayBaseProps {
  publishTime: number;
  coverImage?: string | null;
  profilePicture?: string | null;
  clueMap: Map<string, [number, Direction, string]>;
  user?: User;
  puzzle: PuzzleResultWithAugmentedComments;
  nextPuzzle?: NextPuzzleLink;
  isMuted: boolean;
  solveTime: number;
  didCheat: boolean;
  downsOnly: boolean;
  dispatch: Dispatch<PuzzleAction>;
}

interface SuccessOverlayProps extends PuzzleOverlayBaseProps {
  overlayType: OverlayType.Success;
  contestSubmission?: string;
  contestHasPrize?: boolean;
  contestRevealed?: boolean;
  contestRevealDelay?: number | null;
  shareButtonText?: string;
}
interface BeginPauseProps extends PuzzleOverlayBaseProps {
  overlayType: OverlayType.BeginPause;
  dismissMessage: string;
  message: string;
  loadingPlayState: boolean;
}

export const PuzzleOverlay = (props: SuccessOverlayProps | BeginPauseProps) => {
  const authContext = useContext(AuthContext);
  const { isEmbed, colorMode } = useContext(EmbedContext);
  const contestAnswers = props.puzzle.contestAnswers;
  const isContest = contestAnswers ? contestAnswers.length > 0 : false;
  const winningSubmissions =
    contestAnswers &&
    props.puzzle.contestSubmissions?.filter((sub) =>
      isMetaSolution(sub.s, contestAnswers)
    );

  const [showFullscreen, setShowFullscreen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isEmbed && document.fullscreenEnabled) {
      setShowFullscreen(true);
    }
  }, [isEmbed]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  let loginButton: ReactNode = t`Login (via Google) to save your puzzle progress/stats`;
  if (!authContext.loading) {
    if (authContext.user?.email) {
      loginButton = t`Logged in as ${
        authContext.user.displayName || authContext.user.email
      }`;
    } else if (authContext.user) {
      loginButton = (
        <>
          <GoogleLinkButton
            user={authContext.user}
            text={t`Login (via Google)`}
          />{' '}
          <Trans>to save your puzzle progress/stats</Trans>
        </>
      );
    } else {
      loginButton = (
        <>
          <GoogleSignInButton text={t`Login (via Google)`} />{' '}
          <Trans>to save your puzzle progress/stats</Trans>
        </>
      );
    }
  }

  const solveTimeString = <b>{timeString(props.solveTime, false)}</b>;
  let solvedMessage = <Trans>Solved in</Trans>;
  if (!props.didCheat) {
    if (props.downsOnly) {
      solvedMessage = (
        <Trans>
          Solved <b>downs-only</b> in
        </Trans>
      );
    } else {
      solvedMessage = (
        <Trans>
          Solved <b>without check/reveal</b> in
        </Trans>
      );
    }
  }

  return (
    <Overlay
      coverImage={props.coverImage}
      closeCallback={
        props.overlayType === OverlayType.Success
          ? () => props.dispatch({ type: 'DISMISSSUCCESS' })
          : undefined
      }
    >
      {showFullscreen ? (
        <button
          css={{
            background: 'transparent',
            color: 'var(--text)',
            ...(props.coverImage && { color: 'var(--social-text)' }),
            border: 'none',
            position: 'absolute',
            padding: 0,
            fontSize: '2em',
            verticalAlign: 'text-top',
            width: '1em',
            height: '1em',
            top: '1em',
            left: '1em',
          }}
          onClick={toggleFullscreen}
        >
          <GoScreenFull
            aria-label="toggle fullscreen"
            title="Toggle Fullscreen"
            css={{ position: 'absolute', top: 0, left: 0 }}
          />
        </button>
      ) : (
        ''
      )}
      <PuzzleHeading
        tags={(props.puzzle.userTags || []).concat(props.puzzle.autoTags || [])}
        rating={props.puzzle.rating}
        publishTime={props.publishTime}
        showTip={props.overlayType === OverlayType.Success}
        coverImage={props.coverImage}
        blogPost={props.puzzle.blogPost}
        isContest={isContest}
        constructorNotes={props.puzzle.constructorNotes}
        profilePic={props.profilePicture}
        title={props.puzzle.title}
        authorName={props.puzzle.authorName}
        constructorPage={props.puzzle.constructorPage}
        constructorIsPatron={props.puzzle.constructorIsPatron}
        guestConstructor={props.puzzle.guestConstructor}
      />
      <div css={{ textAlign: 'center' }}>
        {props.overlayType === OverlayType.BeginPause ? (
          <>
            {props.loadingPlayState ? (
              <div>
                <Trans>Checking for previous play data...</Trans>
              </div>
            ) : (
              <>
                <div css={{ marginBottom: '1em' }}>{props.message}</div>
                <Button
                  onClick={() => props.dispatch({ type: 'RESUMEACTION' })}
                  text={props.dismissMessage}
                />
                <p css={{ marginTop: '1em' }}>{loginButton}</p>
                {props.downsOnly ? (
                  <p css={{ marginTop: '1em' }}>
                    <Trans>You are currently solving downs-only:</Trans> (
                    <ButtonAsLink
                      onClick={() => props.dispatch({ type: 'STOPDOWNSONLY' })}
                      text={t`enable across clues`}
                    />
                    ).
                  </p>
                ) : (
                  ''
                )}
                {isContest ? (
                  <p css={{ marginTop: '1em' }}>
                    <Trans id="meta-explanation">
                      This is a contest/meta puzzle. To submit your answer,
                      first finish solving the grid (or reveal it if you get
                      stuck or solved offline).
                    </Trans>
                  </p>
                ) : (
                  ''
                )}
              </>
            )}
          </>
        ) : (
          <>
            {props.user?.uid === props.puzzle.authorId ? (
              <>
                {props.puzzle.isPrivate !== false ||
                (props.puzzle.isPrivateUntil &&
                  props.puzzle.isPrivateUntil > Date.now()) ? (
                  <p>
                    Your puzzle is private
                    {props.puzzle.isPrivateUntil &&
                    props.puzzle.isPrivate === false
                      ? ` until ${formatDistanceToNow(
                          new Date(props.puzzle.isPrivateUntil)
                        )} from now. Until then, it `
                      : '. It '}
                    won&apos;t appear on your Crosshare blog, isn&apos;t
                    eligible to be featured on the homepage, and notifications
                    won&apos;t get sent to any of your followers. It is still
                    viewable by anybody you send the link to or if you embed it
                    on another site.
                  </p>
                ) : (
                  <p>Your puzzle is live!</p>
                )}
                <p>
                  {isEmbed
                    ? `Solvers
              will see an empty grid, yours is complete since you authored the
              puzzle.`
                    : `Copy the link to share with solvers (solvers
                will see an empty grid, yours is complete since you authored the
                puzzle).`}{' '}
                  {props.puzzle.commentsDisabled
                    ? ''
                    : `Comments posted below will be visible to anyone who finishes
                  solving the puzzle
                  ${isContest ? ' and submits a solution to the meta' : ''}.`}
                </p>
              </>
            ) : (
              <>
                <p css={{ marginBottom: 0, fontSize: '1.5em' }}>
                  {solvedMessage} {solveTimeString}
                </p>
                {props.shareButtonText ? (
                  <SharingButtons
                    text={props.shareButtonText
                      .replace('{title}', props.puzzle.title.slice(0, 40))
                      .replace('{time}', timeString(props.solveTime, false))}
                    path={`/crosswords/${props.puzzle.id}/${slugify(
                      props.puzzle.title
                    )}`}
                  />
                ) : (
                  ''
                )}
              </>
            )}
          </>
        )}
      </div>
      {props.overlayType === OverlayType.Success &&
      isContest &&
      props.puzzle.contestAnswers ? (
        <MetaSubmission
          hasPrize={!!props.contestHasPrize}
          contestSubmission={props.contestSubmission}
          contestRevealed={props.contestRevealed}
          revealDisabledUntil={
            props.contestRevealDelay
              ? new Date(props.publishTime + props.contestRevealDelay)
              : null
          }
          dispatch={props.dispatch}
          solutions={props.puzzle.contestAnswers}
          isAuthor={props.user?.uid === props.puzzle.authorId}
        />
      ) : (
        ''
      )}
      <div
        css={{
          ...((props.overlayType === OverlayType.BeginPause ||
            (isContest &&
              !props.contestRevealed &&
              !isMetaSolution(
                props.contestSubmission,
                props.puzzle.contestAnswers || []
              ) &&
              props.user?.uid !== props.puzzle.authorId)) && {
            display: 'none',
          }),
        }}
      >
        {isContest && props.puzzle.contestAnswers ? (
          <>
            <div css={{ marginTop: '1em' }}>
              <h4 css={{ borderBottom: '1px solid var(--black)' }}>
                <Trans>Leaderboard (updated hourly)</Trans>
              </h4>
              {winningSubmissions?.length ? (
                <ul
                  css={{
                    maxHeight: '10em',
                    listStyleType: 'none',
                    padding: '0.5em',
                    overflow: 'scroll',
                  }}
                >
                  {winningSubmissions
                    .sort((w1, w2) => w1.t - w2.t)
                    .map((w, i) => (
                      <li
                        css={{
                          padding: '0.5em 0',
                          borderBottom: '1px solid var(--bg-hover)',
                          '&:last-child': { borderBottom: 'none' },
                        }}
                        key={i}
                      >
                        <strong>{w.n}</strong> solved at{' '}
                        {lightFormat(w.t, "H:mm 'on' M/d/yyyy")}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>
                  <Trans>Nobody is on the leaderboard yet</Trans>
                </p>
              )}
            </div>
          </>
        ) : (
          ''
        )}
        {props.puzzle.commentsDisabled ? (
          isEmbed ? (
            ''
          ) : (
            <div css={{ textAlign: 'center', marginTop: '2em' }}>
              The constructor has disabled comments for this puzzle
            </div>
          )
        ) : (
          <Comments
            downsOnly={props.downsOnly}
            hasGuestConstructor={props.puzzle.guestConstructor !== null}
            clueMap={props.clueMap}
            solveTime={props.solveTime}
            didCheat={props.didCheat}
            puzzleId={props.puzzle.id}
            puzzlePublishTime={props.publishTime}
            puzzleAuthorId={props.puzzle.authorId}
            comments={props.puzzle.comments}
          />
        )}
        {isEmbed ? (
          ''
        ) : (
          <div css={{ textAlign: 'center', marginTop: '2em' }}>
            <PrevDailyMiniLink nextPuzzle={props.nextPuzzle} />
          </div>
        )}
      </div>
      {isEmbed ? (
        <>
          {typeof router.query.backToListPage === 'string' ? (
            <div css={{ marginTop: '2em', textAlign: 'center' }}>
              <Link
                noTargetBlank={true}
                href={`/embed/list/${props.puzzle.authorId}/${
                  router.query.backToListPage
                }${
                  colorMode !== EmbedColorMode.Default
                    ? `?color-mode=${
                        colorMode === EmbedColorMode.Light ? 'light' : 'dark'
                      }`
                    : ''
                }`}
              >
                ⮨ All Puzzles
              </Link>
            </div>
          ) : (
            ''
          )}
          <div css={{ marginTop: '2em', textAlign: 'center' }}>
            <Link href="/">
              <Trans>Powered by crosshare.org</Trans>
            </Link>
            {' · '}
            <Link
              href={`/crosswords/${props.puzzle.id}/${slugify(
                props.puzzle.title
              )}`}
            >
              <Trans>Open on crosshare.org</Trans>
            </Link>
          </div>
        </>
      ) : (
        ''
      )}
    </Overlay>
  );
};
