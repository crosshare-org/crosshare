import { useContext, useEffect, useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

import { LinkButtonSimpleA } from './Link';
import { pastDistanceToNow } from '../lib/utils';
import { ConstructorNotes } from './ConstructorNotes';
import { ConstructorPageT } from '../lib/constructorPage';
import { Button } from './Buttons';
import { ProfilePicAndName } from './Images';
import { Markdown } from './Markdown';
import { ToolTipText } from './ToolTipText';
import { AuthorLink } from './PuzzleLink';
import { EmbedContext } from './EmbedContext';

export const PuzzleHeading = (props: {
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

  const [showFullscreen, setShowFullscreen] = useState(false);

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

  const publishDate = new Date(props.publishTime);
  return (
    <>
      <ProfilePicAndName
        {...props}
        bonusMargin={1}
        topLine={props.title}
        byLine={
          <p>
            <AuthorLink
              authorName={props.authorName}
              constructorPage={props.constructorPage}
              guestConstructor={props.guestConstructor}
            />
            {isEmbed ? (
              ''
            ) : (
              <>
                {' · '}
                <span title={publishDate.toISOString()}>
                  Published {pastDistanceToNow(publishDate)}
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
              tooltip="All donations go directly to the constructor via PayPal"
            />
          </div>
        ) : (
          ''
        )}
      {showFullscreen ? (
        <div css={{ textAlign: 'center' }}>
          <Button
            css={{ marginBottom: '2em' }}
            onClick={toggleFullscreen}
            text="Toggle Fullscreen"
          />
        </div>
      ) : (
        ''
      )}
    </>
  );
};
