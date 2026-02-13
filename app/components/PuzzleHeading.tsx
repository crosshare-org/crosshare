import { Trans } from '@lingui/react/macro';
import type { Root } from 'hast';
import { ReactNode, useContext } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { ConstructorPageWithMarkdown } from '../lib/constructorPage.js';
import { GlickoScoreT } from '../lib/dbtypes.js';
import { ConstructorNotes } from './ConstructorNotes.js';
import { DifficultyBadge } from './DifficultyBadge.js';
import { EmbedContext } from './EmbedContext.js';
import { ProfilePicAndName } from './Images.js';
import { LinkButtonSimpleA } from './Link.js';
import { Markdown } from './Markdown.js';
import { PublishDate } from './PublishDate.js';
import styles from './PuzzleHeading.module.css';
import { AuthorLink } from './PuzzleLink.js';
import { TagList } from './TagList.js';
import { ToolTipText } from './ToolTipText.js';

export const PuzzleHeading = (props: {
  rating: GlickoScoreT | null;
  publishTime: number;
  isPrivate: number | boolean;
  isPrivateUntil: number | null;
  showTip: boolean;
  isContest: boolean;
  constructorNotes: Root | null;
  coverImage: string | null | undefined;
  profilePic: string | null | undefined;
  title: string;
  authorName: string;
  guestConstructor: string | null;
  constructorPage: ConstructorPageWithMarkdown | null;
  constructorIsPatron: boolean;
  blogPost: Root | null;
  tags: string[];
  dailyMiniDate?: string;
  likeButton?: ReactNode;
}) => {
  const { isEmbed } = useContext(EmbedContext);

  return (
    <>
      <ProfilePicAndName
        {...props}
        bonusMargin={1}
        topLine={
          props.likeButton !== undefined ? (
            <>
              <span className="marginRight1em">{props.title}</span>
              {props.likeButton}
            </>
          ) : (
            <span>{props.title}</span>
          )
        }
        byLine={
          <p className="overflowWrapBreakWord">
            <DifficultyBadge puzzleRating={props.rating} />
            {' · '}
            <AuthorLink
              authorName={props.authorName}
              constructorPage={props.constructorPage}
              guestConstructor={props.guestConstructor}
              showFollowButton={true}
              isPatron={props.constructorIsPatron}
            />
            {isEmbed ? (
              ''
            ) : (
              <>
                {' · '}
                <PublishDate
                  useErrorColor={false}
                  showPrivateStatus
                  isPrivate={props.isPrivate}
                  isPrivateUntil={props.isPrivateUntil}
                  publishTime={props.publishTime}
                />
              </>
            )}
            {props.dailyMiniDate ? (
              <>
                {' · '}
                Crosshare&apos;s Daily Mini for {props.dailyMiniDate}
              </>
            ) : (
              ''
            )}
          </p>
        }
      />
      <TagList className={styles.taglist} tags={props.tags} link />
      {props.constructorNotes ? (
        <div className="textAlignCenter overflowWrapBreakWord smallHeadings">
          <ConstructorNotes
            isContest={props.isContest}
            notes={props.constructorNotes}
          />
        </div>
      ) : (
        ''
      )}
      {props.blogPost ? (
        <div className="margin1em0 overflowWrapBreakWord smallHeadings">
          <Markdown className="textAlignLeft" hast={props.blogPost} />
        </div>
      ) : (
        ''
      )}
      {props.constructorPage?.sig ? (
        <div className="margin1em0 overflowWrapBreakWord smallHeadings">
          <Markdown
            inline={true}
            className="textAlignLeft"
            hast={props.constructorPage.sig}
          />
        </div>
      ) : (
        ''
      )}

      {props.showTip &&
      props.constructorPage?.pp &&
      props.constructorPage.pt ? (
        <div className="textAlignCenter">
          <LinkButtonSimpleA
            className="marginRight0-5em"
            href={`https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(
              props.constructorPage.pp
            )}&item_name=${encodeURIComponent(
              props.constructorPage.pt
            )}&currency_code=USD&source=url`}
            text={`Tip ${props.constructorPage.n}`}
          />
          <ToolTipText
            text={<FaInfoCircle />}
            tooltip={
              <Trans>
                All donations go directly to the constructor via PayPal
              </Trans>
            }
          />
        </div>
      ) : (
        ''
      )}
    </>
  );
};
