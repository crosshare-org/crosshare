import { SMALL_AND_UP, LARGE_AND_UP } from '../lib/style';
import { ReactNode } from 'react';

const ProfilePic = (props: { profilePicture: string; className?: string }) => {
  return (
    <div
      className={props.className}
      css={{
        width: 75,
        height: 75,
        position: 'relative',
        overflow: 'hidden',
        [SMALL_AND_UP]: {
          width: 100,
          height: 100,
        },
        boxSizing: 'content-box',
        border: '4px solid var(--bg)',
        borderRadius: '50%',
      }}
    >
      <img
        css={{
          width: 75,
          height: 75,
          [SMALL_AND_UP]: {
            width: 100,
            height: 100,
          },
        }}
        width={200}
        height={200}
        src={props.profilePicture}
        alt="Profile"
      />
    </div>
  );
};

export const CoverPic = (props: { coverPicture: string }) => {
  return (
    <div
      css={{
        width: '100%',
        height: '150px',
        [SMALL_AND_UP]: {
          height: '225px',
        },
        [LARGE_AND_UP]: {
          height: '300px',
        },
        backgroundImage: `linear-gradient(to top, black, rgba(0, 0, 0, 0.8) 2em, transparent 40%, transparent 75%, rgba(0, 0, 0, 0.5)),
    url('${props.coverPicture}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );
};

export const ProfilePicAndName = (props: {
  bonusMargin?: number;
  coverImage: string | null | undefined;
  profilePic: string | null | undefined;
  topLine: string;
  byLine: ReactNode;
}) => {
  return (
    <div
      css={{
        display: 'flex',
        ...(props.coverImage && {
          marginTop: `${-4.5 - (props.bonusMargin || 0)}em`,
        }),
      }}
    >
      {props.profilePic ? (
        <div css={{ flex: '1 1 auto', textAlign: 'right' }}>
          <ProfilePic
            css={{
              display: 'inline-block',
              marginTop: '-0.5em',
              marginRight: '1em',
              [SMALL_AND_UP]: { marginTop: '-1.5em' },
            }}
            profilePicture={props.profilePic}
          />
        </div>
      ) : (
        ''
      )}
      <div
        css={{
          flex: '1 1 auto',
          textAlign: props.profilePic ? 'left' : 'center',
        }}
      >
        <h1
          css={{
            fontSize: '1.5em',
            ...(props.coverImage && {
              color: 'white',
              mixBlendMode: 'difference',
            }),
          }}
        >
          {props.topLine}
        </h1>
        {props.byLine}
      </div>
    </div>
  );
};
