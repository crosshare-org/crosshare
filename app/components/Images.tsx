import { SMALL_AND_UP, COVER_PIC, LARGE_AND_UP } from '../lib/style';

export const ProfilePic = (props: { profilePicture: string, className?: string }) => {
  return <div className={props.className} css={{
    width: 75,
    height: 75,
    position: 'relative',
    overflow: 'hidden',
    [SMALL_AND_UP]: {
      width: 100,
      height: 100
    },
    boxSizing: 'content-box',
    border: '4px solid var(--bg)',
    borderRadius: '50%',
  }}>
    <img css={{
      width: 75,
      height: 75,
      [SMALL_AND_UP]: {
        width: 100,
        height: 100
      },
    }} src={props.profilePicture} alt="Profile" />
  </div>;
};

export const CoverPic = (props: { coverPicture: string }) => {
  return <img width={COVER_PIC[0]} height={COVER_PIC[1]} css={{
    width: '100%',
    maxHeight: '150px',
    [SMALL_AND_UP]: {
      maxHeight: '225px',
    },
    [LARGE_AND_UP]: {
      maxHeight: '300px',
    },
    objectFit: 'cover',
  }} src={props.coverPicture} alt="Cover" />;
};
