import { useContext } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

import { LinkButtonSimpleA } from './Link';
import { PastDistanceToNow } from './TimeDisplay';
import { ConstructorNotes } from './ConstructorNotes';
import { ConstructorPageT } from '../lib/constructorPage';
import { ProfilePicAndName } from './Images';
import { Markdown } from './Markdown';
import { ToolTipText } from './ToolTipText';
import { AuthorLink } from './PuzzleLink';
import { EmbedContext } from './EmbedContext';
import { GlickoScoreT } from '../lib/dbtypes';
import { DifficultyBadge } from './DifficultyBadge';
import { Trans } from '@lingui/macro';

export const PuzzleHeading = (props: {
  rating: GlickoScoreT | null;
  publishTime: number;
  showTip: boolean;
  isContest: boolean;
  constructorNotes: string | null;
  coverImage: string | null | undefined;
  profilePic: string | null | undefined;
  title: string;
  authorName: string;
  guestConstructor: string | null;
  constructorPage: ConstructorPageT | null;
  blogPost: string | null;
}) => {
  const isEmbed = useContext(EmbedContext);

  const publishDate = new Date(props.publishTime);
  return (
    <>
      <ProfilePicAndName
        {...props}
        bonusMargin={1}
        topLine={props.title}
        byLine={
          <p>
            <DifficultyBadge puzzleRating={props.rating} />
            {' · '}
            <AuthorLink
              authorName={props.authorName}
              constructorPage={props.constructorPage}
              guestConstructor={props.guestConstructor}
              showFollowButton={true}
            />
            {isEmbed ? (
              ''
            ) : (
              <>
                {' · '}
                <span title={publishDate.toISOString()}>
                  <Trans comment="The variable is a timestamp like '4 days ago' or 'hace 4 dias'">
                    Published <PastDistanceToNow date={publishDate} />
                  </Trans>
                </span>
              </>
            )}
          </p>
        }
      />
      {props.constructorNotes ? (
        <div css={{ textAlign: 'center' }}>
          <ConstructorNotes
            isContest={props.isContest}
            notes={props.constructorNotes}
          />
        </div>
      ) : (
        ''
      )}
      {props.blogPost ? (
        <div css={{ margin: '1em 0' }}>
          <Markdown css={{ textAlign: 'left' }} text={props.blogPost} />
        </div>
      ) : (
        ''
      )}
      {props.constructorPage?.sig ? (
        <div css={{ margin: '1em 0' }}>
          <Markdown
            inline={true}
            css={{ textAlign: 'left' }}
            text={props.constructorPage.sig}
          />
        </div>
      ) : (
        ''
      )}

      {props.showTip &&
      props.constructorPage?.pp &&
      props.constructorPage.pt ? (
          <div css={{ textAlign: 'center' }}>
            <LinkButtonSimpleA
              css={{ marginRight: '0.5em' }}
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
                <Trans id="tip-hover">
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
