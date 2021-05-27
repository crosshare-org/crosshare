import { useContext, Dispatch } from 'react';
import { Link } from './Link';
import { Direction, ServerPuzzleResult } from '../lib/types';
import { PuzzleAction } from '../reducers/reducer';
import { timeString } from '../lib/utils';
import type firebase from 'firebase/app';
import { Comments } from './Comments';
import { EmbedContext } from './EmbedContext';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { NextPuzzleLink } from './Puzzle';
import { Overlay } from './Overlay';
import { PuzzleHeading } from './PuzzleHeading';
import { Button } from './Buttons';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';

const PrevDailyMiniLink = ({ nextPuzzle }: { nextPuzzle?: NextPuzzleLink }) => {
  if (!nextPuzzle) {
    return <></>;
  }
  return (
    <Link href={`/crosswords/${nextPuzzle.puzzleId}`}>
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
  user?: firebase.User;
  puzzle: ServerPuzzleResult;
  nextPuzzle?: NextPuzzleLink;
  isMuted: boolean;
  solveTime: number;
  didCheat: boolean;
  dispatch: Dispatch<PuzzleAction>;
}

interface SuccessOverlayProps extends PuzzleOverlayBaseProps {
  overlayType: OverlayType.Success;
  contestSubmission?: string;
}
interface BeginPauseProps extends PuzzleOverlayBaseProps {
  overlayType: OverlayType.BeginPause;
  dismissMessage: string;
  message: string;
  loadingPlayState: boolean;
}

export const PuzzleOverlay = (props: SuccessOverlayProps | BeginPauseProps) => {
  const isEmbed = useContext(EmbedContext);
  const isContest =
    props.puzzle.contestAnswers && props.puzzle.contestAnswers.length > 0;
  return (
    <Overlay
      coverImage={props.coverImage}
      closeCallback={
        props.overlayType === OverlayType.Success
          ? () => props.dispatch({ type: 'DISMISSSUCCESS' })
          : undefined
      }
    >
      <PuzzleHeading
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
        guestConstructor={props.puzzle.guestConstructor}
      />
      <div css={{ textAlign: 'center' }}>
        {props.overlayType === OverlayType.BeginPause ? (
          <>
            {props.loadingPlayState ? (
              <div>Checking for previous play data...</div>
            ) : (
              <>
                <div css={{ marginBottom: '1em' }}>{props.message}</div>
                <Button
                  onClick={() => props.dispatch({ type: 'RESUMEACTION' })}
                  text={props.dismissMessage}
                />
              </>
            )}
          </>
        ) : (
          <>
            {props.user?.uid === props.puzzle.authorId ? (
              <>
                {props.puzzle.isPrivate ||
                (props.puzzle.isPrivateUntil &&
                  props.puzzle.isPrivateUntil > Date.now()) ? (
                    <p>
                    Your puzzle is private
                      {props.puzzle.isPrivateUntil && !props.puzzle.isPrivate
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
                  Comments posted below will be visible to anyone who finishes
                  solving the puzzle
                  {isContest ? ' and submits a solution to the meta' : ''}.
                </p>
              </>
            ) : (
              <>
                <p css={{ marginBottom: 0, fontSize: '1.5em' }}>
                  Solved in <b>{timeString(props.solveTime, false)}</b>
                </p>
              </>
            )}
            {isEmbed ? (
              ''
            ) : (
              <div>
                <PrevDailyMiniLink nextPuzzle={props.nextPuzzle} />
              </div>
            )}
          </>
        )}
      </div>
      {props.overlayType === OverlayType.Success &&
      isContest &&
      props.user?.uid !== props.puzzle.authorId ? (
          !props.user || props.user.isAnonymous ? (
            <>
              <div css={{ marginTop: '1em', textAlign: 'center' }}>
                <p>
                This is a meta puzzle! Sign in with google to submit your
                solution, view the solution, view the leaderboard, and read or
                submit comments:
                </p>
                {props.user ? (
                  <GoogleLinkButton user={props.user} />
                ) : (
                  <GoogleSignInButton />
                )}
              </div>
            </>
          ) : !props.contestSubmission ? (
            <>
              <div css={{ marginTop: '1em', textAlign: 'center' }}>
                <p>
                This is a meta puzzle! Submit your solution to see if you got
                it, view the leaderboard, and read or submit comments:
                </p>
              </div>
            </>
          ) : (
            <></>
          )
        ) : (
          ''
        )}
      <div
        css={{
          ...((props.overlayType === OverlayType.BeginPause ||
            (isContest &&
              !props.contestSubmission &&
              props.user?.uid !== props.puzzle.authorId)) && {
            display: 'none',
          }),
        }}
      >
        {isContest ? (
          <>
            <div css={{ marginTop: '1em' }}>
              <h4 css={{ borderBottom: '1px solid var(--black)' }}>
                Contest Leaderboard (updated hourly)
              </h4>
              <p>TODO</p>
            </div>
          </>
        ) : (
          ''
        )}
        <Comments
          hasGuestConstructor={props.puzzle.guestConstructor !== null}
          clueMap={props.clueMap}
          solveTime={props.solveTime}
          didCheat={props.didCheat}
          puzzleId={props.puzzle.id}
          puzzlePublishTime={
            props.puzzle.isPrivateUntil
              ? props.puzzle.isPrivateUntil
              : props.puzzle.publishTime
          }
          puzzleAuthorId={props.puzzle.authorId}
          comments={props.puzzle.comments}
        />
      </div>
      {isEmbed ? (
        <div css={{ marginTop: '2em', textAlign: 'center' }}>
          <Link href="/">Powered by crosshare.org</Link>
        </div>
      ) : (
        ''
      )}
    </Overlay>
  );
};
