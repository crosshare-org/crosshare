import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { EmbedContext } from './EmbedContext.js';
import { CoverPic } from './Images.js';
import styles from './Overlay.module.scss';

export const Overlay = (props: {
  coverImage?: string | null;
  onClick?: () => void;
  hidden?: boolean;
  closeCallback?: () => void;
  children: React.ReactNode;
  innerPadding?: string;
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const { isSlate } = useContext(EmbedContext);

  useEffect(() => {
    ref.current = document.getElementById('modal');
    if (!ref.current) {
      ref.current = document.createElement('div');
      ref.current.setAttribute('id', 'modal');
      document.body.appendChild(ref.current);
    }
    setMounted(true);
  }, []);

  const overlay = (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <div
      data-slate={isSlate}
      data-hidden={props.hidden}
      data-cover={Boolean(props.coverImage)}
      onClick={props.onClick ?? (() => undefined)}
      className={styles.overlay}
    >
      <div className={styles.inner}>
        {props.coverImage ? <CoverPic coverPicture={props.coverImage} /> : ''}
        <div style={{ padding: props.innerPadding ?? '3em 1.5em' }}>
          {props.closeCallback ? (
            <button
              className={styles.closeButton}
              onClick={props.closeCallback}
            >
              <IoMdCloseCircleOutline
                aria-label="close"
                className={styles.closeIcon}
              />
            </button>
          ) : (
            ''
          )}
          {props.children}
        </div>
      </div>
    </div>
  );

  return mounted && ref.current ? createPortal(overlay, ref.current) : overlay;
};
