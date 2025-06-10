import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import type { User } from 'firebase/auth';
import { useRouter } from 'next/router';
import { Dispatch, ReactNode, useContext, useEffect, useState } from 'react';
import { GoScreenFull } from 'react-icons/go';
import { PuzzleReaction } from '../lib/reactions.js';
import { Direction, PuzzleResultWithAugmentedComments } from '../lib/types.js';
import {
  isMetaSolution,
  logAsyncErrors,
  slugify,
  timeString,
} from '../lib/utils.js';
import { PuzzleAction } from '../reducers/commonActions.js';
import { AuthContext } from './AuthContext.js';
import { Button, ButtonAsLink } from './Buttons.js';
import { Comments } from './Comments.js';
import { EmbedColorMode, EmbedContext } from './EmbedContext.js';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons.js';
import { Link } from './Link.js';
import { MetaSubmission } from './MetaSubmission.js';
import { Overlay } from './Overlay.js';
import { NextPuzzleLink } from './Puzzle.js';
import { PuzzleHeading } from './PuzzleHeading.js';
import styles from './PuzzleOverlay.module.css';
import { ReactionButton } from './ReactionButton.js';
import { SharingButtons } from './SharingButtons.js';
import { PastDistanceToNow } from './TimeDisplay.js';

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

  const [showFullscreen, setShowFullscreen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isEmbed && document.fullscreenEnabled) {
      setShowFullscreen(true);
    }
  }, [isEmbed]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  let loginButton: ReactNode = t`Login (via Google) to save your puzzle progress/stats`;
  if (!authContext.loading) {
    if (authContext.user?.email) {
      const displayNameOrEmail =
        authContext.user.displayName || authContext.user.email;
      loginButton = t`Logged in as ${displayNameOrEmail}`;
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
          ? () => {
              props.dispatch({ type: 'DISMISSSUCCESS' });
            }
          : undefined
      }
    >
      {showFullscreen ? (
        <button
          data-has-cover={Boolean(props.coverImage)}
          className={styles.fullscreen}
          onClick={logAsyncErrors(toggleFullscreen)}
        >
          <GoScreenFull
            aria-label="toggle fullscreen"
            title="Toggle Fullscreen"
            className={styles.fullscreenIcon}
          />
        </button>
      ) : (
        ''
      )}
      <PuzzleHeading
        dailyMiniDate={props.puzzle.dailyMiniDate}
        tags={(props.puzzle.userTags ?? []).concat(props.puzzle.autoTags ?? [])}
        rating={props.puzzle.rating}
        publishTime={props.publishTime}
        showTip={props.overlayType === OverlayType.Success}
        coverImage={props.coverImage}
        blogPost={props.puzzle.blogPost}
        isContest={props.puzzle.isContest}
        constructorNotes={props.puzzle.constructorNotes}
        profilePic={props.profilePicture}
        title={props.puzzle.title}
        authorName={props.puzzle.authorName}
        constructorPage={props.puzzle.constructorPage}
        constructorIsPatron={props.puzzle.constructorIsPatron}
        guestConstructor={props.puzzle.guestConstructor}
        likeButton={
          props.overlayType === OverlayType.Success ? (
            <ReactionButton kind={PuzzleReaction.Like} puzzle={props.puzzle} />
          ) : undefined
        }
      />
      <div className="textAlignCenter">
        {props.overlayType === OverlayType.BeginPause ? (
          <>
            {props.loadingPlayState ? (
              <div>
                <Trans>Checking for previous play data...</Trans>
              </div>
            ) : (
              <>
                <div className="marginBottom1em">{props.message}</div>
                <Button
                  onClick={() => {
                    window.parent.postMessage({ type: 'resume' }, '*');
                    props.dispatch({ type: 'RESUMEACTION' });
                  }}
                  text={props.dismissMessage}
                />
                <p className="marginTop1em">{loginButton}</p>
                {props.downsOnly ? (
                  <p className="marginTop1em">
                    <Trans>You are currently solving downs-only:</Trans> (
                    <ButtonAsLink
                      onClick={() => {
                        props.dispatch({ type: 'STOPDOWNSONLY' });
                      }}
                      text={t`enable across clues`}
                    />
                    ).
                  </p>
                ) : (
                  ''
                )}
                {props.puzzle.isContest ? (
                  <p className="marginTop1em">
                    <Trans>
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
                  ${props.puzzle.isContest ? ' and submits a solution to the meta' : ''}.`}
                </p>
              </>
            ) : (
              <>
                <p className="marginBottom0 fontSize1-5em">
                  {solvedMessage} {solveTimeString}
                </p>
                {props.shareButtonText ? (
                  <SharingButtons
                    text={props.shareButtonText
                      .replace(
                        '{title}',
                        props.puzzle.title
                          // Strip emojis
                          .replace(
                            /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
                            ''
                          )
                          .slice(0, 40)
                          .trim()
                      )
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
      {props.overlayType === OverlayType.Success && props.puzzle.isContest ? (
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
          solutionDigests={props.puzzle.contestAnswerDigests}
          puzzleId={props.puzzle.id}
          isAuthor={props.user?.uid === props.puzzle.authorId}
        />
      ) : (
        ''
      )}
      <div
        style={{
          ...((props.overlayType === OverlayType.BeginPause ||
            (props.puzzle.isContest &&
              !props.contestRevealed &&
              !isMetaSolution(
                props.contestSubmission,
                props.puzzle.contestAnswers,
                props.puzzle.contestAnswerDigests,
                props.puzzle.id
              ) &&
              props.user?.uid !== props.puzzle.authorId)) && {
            display: 'none',
          }),
        }}
      >
        {props.puzzle.isContest ? (
          <>
            <div className="marginTop1em">
              <h4 className="borderBottom1pxSolidBlack">
                <Trans>Leaderboard (updated hourly)</Trans>
              </h4>
              {props.puzzle.contestWinningSubmissions.length ? (
                <ul className={styles.leaderboard}>
                  {props.puzzle.contestWinningSubmissions
                    .sort((w1, w2) => w1.t - w2.t)
                    .map((w, i) => (
                      <li className={styles.leaderboardEntry} key={i}>
                        <strong>{w.n}</strong> solved{' '}
                        <PastDistanceToNow date={new Date(w.t)} />{' '}
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
            <div className={styles.section}>
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
          <div className={styles.section}>
            <PrevDailyMiniLink nextPuzzle={props.nextPuzzle} />
          </div>
        )}
      </div>
      {isEmbed ? (
        <>
          {typeof router.query.backToListPage === 'string' ? (
            <div className={styles.section}>
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
                ⏎ All Puzzles
              </Link>
            </div>
          ) : (
            ''
          )}
          <div className={styles.section}>
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
