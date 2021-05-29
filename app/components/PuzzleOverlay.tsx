import { useContext, Dispatch } from 'react';
import { Link } from './Link';
import { Direction, ServerPuzzleResult } from '../lib/types';
import { PuzzleAction } from '../reducers/reducer';
import { isMetaSolution, timeString } from '../lib/utils';
import type firebase from 'firebase/app';
import { Comments } from './Comments';
import { EmbedContext } from './EmbedContext';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { NextPuzzleLink } from './Puzzle';
import { Overlay } from './Overlay';
import { PuzzleHeading } from './PuzzleHeading';
import { Button } from './Buttons';
import { MetaSubmission } from './MetaSubmission';
import { lightFormat } from 'date-fns';

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
  contestHasPrize?: boolean;
}
interface BeginPauseProps extends PuzzleOverlayBaseProps {
  overlayType: OverlayType.BeginPause;
  dismissMessage: string;
  message: string;
  loadingPlayState: boolean;
}

export const PuzzleOverlay = (props: SuccessOverlayProps | BeginPauseProps) => {
  const isEmbed = useContext(EmbedContext);
  const contestAnswers = props.puzzle.contestAnswers;
  const isContest = contestAnswers ? contestAnswers.length > 0 : false;
  const winningSubmissions =
    contestAnswers &&
    props.puzzle.contestSubmissions?.filter((sub) =>
      isMetaSolution(sub.s, contestAnswers)
    );

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
                {isContest ? (
                  <p>
                    This is a contest/meta puzzle. To submit your answer, first
                    finish solving the grid (or reveal it if you get stuck or
                    solved offline).
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
          </>
        )}
      </div>
      {props.overlayType === OverlayType.Success &&
      isContest &&
      props.puzzle.contestAnswers &&
      props.user?.uid !== props.puzzle.authorId ? (
          <MetaSubmission
            hasPrize={!!props.contestHasPrize}
            contestSubmission={props.contestSubmission}
            puzzleId={props.puzzle.id}
            solutions={props.puzzle.contestAnswers}
          />
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
        {isContest && props.puzzle.contestAnswers ? (
          <>
            <div css={{ marginTop: '1em' }}>
              <h4 css={{ borderBottom: '1px solid var(--black)' }}>
                Leaderboard (updated hourly)
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
                        {lightFormat(w.t, 'H:mm \'on\' M/d/yyyy')}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>Nobody is on the leaderboard yet</p>
              )}
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
        {isEmbed ? (
          ''
        ) : (
          <div css={{ textAlign: 'center' }}>
            <PrevDailyMiniLink nextPuzzle={props.nextPuzzle} />
          </div>
        )}
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
