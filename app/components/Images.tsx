/* eslint-disable @next/next/no-img-element */
import { ReactNode } from 'react';
import { clsx } from '../lib/utils.js';
import styles from './Images.module.css';

const ProfilePic = (props: { profilePicture: string; className?: string }) => {
  return (
    <div className={clsx(styles.profilePicWrapper, props.className)}>
      <img
        className={styles.profilePicImage}
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
      style={{
        backgroundImage: `linear-gradient(to top, black, rgba(0, 0, 0, 0.8) 2em, transparent 40%, transparent 75%, rgba(0, 0, 0, 0.5)),
      url('${props.coverPicture}')`,
      }}
      className={styles.coverPic}
    />
  );
};

export const ProfilePicAndName = (props: {
  bonusMargin?: number;
  coverImage: string | null | undefined;
  profilePic: string | null | undefined;
  topLine: ReactNode;
  byLine: ReactNode;
}) => {
  return (
    <div
      style={{
        ...(props.coverImage && {
          marginTop: `${-4.5 - (props.bonusMargin || 0)}em`,
        }),
      }}
      className="displayFlex"
    >
      {props.profilePic ? (
        <div className={styles.picWrap}>
          <ProfilePic
            className={styles.pic}
            profilePicture={props.profilePic}
          />
        </div>
      ) : (
        ''
      )}
      <div data-has-pic={Boolean(props.profilePic)} className={styles.textArea}>
        <h1
          data-has-cover={Boolean(props.coverImage)}
          className={styles.topLine}
        >
          {props.topLine}
        </h1>
        {props.byLine}
      </div>
    </div>
  );
};
