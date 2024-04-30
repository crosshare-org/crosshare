import { Trans, t } from '@lingui/macro';
import { updateDoc } from 'firebase/firestore';
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FaComment,
  FaComments,
  FaHammer,
  FaRegGrinStars,
  FaRegNewspaper,
  FaUser,
  FaUserLock,
} from 'react-icons/fa';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { getDocRef } from '../lib/firebaseWrapper';
import { NotificationT } from '../lib/notificationTypes';
import { ANIMATION_DELAY, HEADER_HEIGHT } from '../lib/style';
import { logAsyncErrors, slugify } from '../lib/utils';
import { AuthContext } from './AuthContext';
import { ButtonAsLink, ButtonReset } from './Buttons';
import { EmbedContext } from './EmbedContext';
import { Logo } from './Icons';
import { Link } from './Link';
import { Overlay } from './Overlay';
import styles from './TopBar.module.css';

export const TopBarDropDown = (props: {
  onClose?: () => void;
  text: string;
  icon: ReactNode;
  hoverText?: string;
  children: (close: () => void) => ReactNode;
}) => {
  const [dropped, setDropped] = useState(false);
  const close = () => {
    props.onClose?.();
    setDropped(false);
  };
  return (
    <>
      <TopBarLink
        onClick={() => {
          setDropped(!dropped);
        }}
        text={props.text}
        icon={props.icon}
        hoverText={props.hoverText}
      />
      <Overlay onClick={close} closeCallback={close} hidden={!dropped}>
        {props.children(close)}
      </Overlay>
    </>
  );
};

export const NestedDropDown = (props: {
  onClose?: () => void;
  text: string;
  icon: ReactNode;
  closeParent: () => void;
  children: (close: () => void) => ReactNode;
}) => {
  const [dropped, setDropped] = useState(false);
  const close = () => {
    props.onClose?.();
    setDropped(false);
  };
  return (
    <>
      <TopBarDropDownLink
        onClick={() => {
          props.closeParent();
          setDropped(true);
        }}
        text={props.text}
        icon={props.icon}
      />
      <Overlay onClick={close} closeCallback={close} hidden={!dropped}>
        {props.children(close)}
      </Overlay>
    </>
  );
};

interface TopBarDropDownLinkCommonProps {
  shortcutHint?: ReactNode;
  text: string;
  icon: ReactNode;
}
const TopBarDropDownLinkContents = (props: TopBarDropDownLinkCommonProps) => {
  return (
    <>
      <div className={styles.dropdownLinkIcon}>{props.icon}</div>
      <div className={styles.dropdownLinkText}>
        {props.text}
        {props.shortcutHint !== undefined ? (
          <span className={styles.dropdownLinkShortcut}>
            {' '}
            (<Trans>hotkey</Trans>:{' '}
            <span className={styles.shortcutHint}>{props.shortcutHint}</span> )
          </span>
        ) : (
          ''
        )}
      </div>
    </>
  );
};

interface TopBarDropDownLinkProps extends TopBarDropDownLinkCommonProps {
  onClick?: () => void;
}
export const TopBarDropDownLink = (props: TopBarDropDownLinkProps) => {
  return (
    <button
      title={props.text}
      className={styles.dropdownLink}
      onClick={props.onClick}
    >
      <TopBarDropDownLinkContents {...props} />
    </button>
  );
};

interface TopBarDropDownLinkAProps extends TopBarDropDownLinkCommonProps {
  href: string;
}
export const TopBarDropDownLinkA = (props: TopBarDropDownLinkAProps) => {
  return (
    <Link href={props.href} title={props.text} className={styles.dropdownLink}>
      <TopBarDropDownLinkContents {...props} />
    </Link>
  );
};

export const TopBarDropDownLinkSimpleA = (props: TopBarDropDownLinkAProps) => {
  const { isEmbed } = useContext(EmbedContext);
  return (
    <a
      {...(isEmbed && { target: '_blank', rel: 'noreferrer' })}
      href={props.href}
      title={props.text}
      className={styles.dropdownLink}
    >
      <TopBarDropDownLinkContents {...props} />
    </a>
  );
};

interface TopBarLinkCommonProps {
  text?: string;
  keepText?: boolean;
  icon: ReactNode;
}
const TopBarLinkContents = (props: TopBarLinkCommonProps) => {
  const { isSlate } = useContext(EmbedContext);
  return (
    <>
      <span data-slate={isSlate} className={styles.linkContentsIcon}>
        {props.icon}
      </span>
      {props.text ? (
        <span
          data-keep-text={props.keepText}
          data-slate={isSlate}
          className={styles.linkContentsText}
        >
          {props.text}
        </span>
      ) : (
        ''
      )}
    </>
  );
};

interface TopBarLinkProps extends TopBarLinkCommonProps {
  onClick?: () => void;
  hoverText?: string;
}

export const TopBarLink = (props: TopBarLinkProps) => {
  const { isSlate } = useContext(EmbedContext);
  return (
    <button
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      title={props.hoverText || props.text}
      data-slate={isSlate}
      className={styles.topBarLink}
      onClick={props.onClick}
    >
      <TopBarLinkContents {...props} />
    </button>
  );
};

interface TopBarLinkAProps extends TopBarLinkProps {
  disabled?: boolean;
  href: string;
  as?: string;
}

export const TopBarLinkA = (props: TopBarLinkAProps) => {
  return (
    <Link
      data-disabled={props.disabled}
      href={props.href}
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      title={props.hoverText || props.text}
      className={styles.topBarLinkA}
      onClick={props.onClick}
    >
      <TopBarLinkContents {...props} />
    </Link>
  );
};

export const TopBar = ({
  children,
  title,
}: {
  children?: ReactNode;
  title?: string;
}) => {
  const { notifications } = useContext(AuthContext);
  const { isEmbed } = useContext(EmbedContext);
  const now = new Date();
  const filtered = notifications?.filter((n) => n.t.toDate() <= now);
  const [showingNotifications, setShowingNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: Event) => {
      if (
        showingNotifications &&
        !notificationsRef.current?.contains(event.target as Node)
      ) {
        setShowingNotifications(false);
      }
    },
    [showingNotifications]
  );

  useEffect(() => {
    if (!filtered?.length) {
      setShowingNotifications(false);
    }
  }, [filtered]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [handleClickOutside]);

  const { isSlate } = useContext(EmbedContext);

  return useMemo(() => {
    const today = new Date();
    return (
      <>
        <header
          data-slate={isSlate}
          data-pride={!isEmbed && today.getUTCMonth() === 5}
          data-tgdr={
            !isEmbed && today.getUTCMonth() === 10 && today.getUTCDate() === 20
          }
          className={styles.header}
        >
          <div className={styles.headerInner}>
            {isEmbed ? (
              isSlate ? (
                ''
              ) : (
                <div title={title} className={styles.embedTitle}>
                  {title}
                </div>
              )
            ) : filtered?.length && !showingNotifications ? (
              <ButtonReset
                onClick={(e) => {
                  setShowingNotifications(true);
                  e.stopPropagation();
                }}
                className={styles.notificationsBtn}
                title="View Notifications"
              >
                <Logo
                  notificationCount={filtered.length}
                  width={HEADER_HEIGHT - 4}
                  height={HEADER_HEIGHT - 4}
                />
                <span className={styles.logoText}>CROSSHARE</span>
              </ButtonReset>
            ) : (
              <Link href="/" className={styles.logoLink} title="Crosshare Home">
                <Logo
                  notificationCount={0}
                  width={HEADER_HEIGHT - 4}
                  height={HEADER_HEIGHT - 4}
                />
                <span className={styles.logoText}>CROSSHARE</span>
              </Link>
            )}
            <>{children}</>
          </div>
        </header>
        {filtered?.length && showingNotifications ? (
          <div ref={notificationsRef} className={styles.notifications}>
            <h3 className={styles.notificationsHeader}>
              Notifications
              <ButtonAsLink
                className="floatRight marginRight1em"
                text="Dismiss all"
                onClick={logAsyncErrors(async () => {
                  await Promise.all(
                    filtered.map((n) =>
                      updateDoc(getDocRef('n', n.id), { r: true })
                    )
                  );
                })}
              />
            </h3>
            <div className={styles.notificationsList}>
              {filtered.map((n) => (
                <NotificationLink key={n.id} notification={n} />
              ))}
            </div>
          </div>
        ) : (
          ''
        )}
      </>
    );
  }, [
    children,
    filtered,
    showingNotifications,
    setShowingNotifications,
    isEmbed,
    isSlate,
    title,
  ]);
};

const NotificationLink = ({
  notification: n,
}: {
  notification: NotificationT;
}): JSX.Element => {
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    // Close the toast which causes it to start shrinking
    setClosing(true);
    // After shrink vertically we remove the toast
    setTimeout(
      logAsyncErrors(async () => {
        await updateDoc(getDocRef('n', n.id), { r: true });
      }),
      ANIMATION_DELAY
    );
  }, [n.id]);

  let link: JSX.Element;
  switch (n.k) {
    case 'comment':
      link = (
        <Link
          className={styles.notificationLinkInner}
          href={`/crosswords/${n.p}/${slugify(n.pn)}`}
        >
          <FaComment className="marginRight0-5em" /> {n.cn} commented on{' '}
          <u>{n.pn}</u>
        </Link>
      );
      break;
    case 'reply':
      link = (
        <Link
          className={styles.notificationLinkInner}
          href={`/crosswords/${n.p}/${slugify(n.pn)}`}
        >
          <FaComments className="marginRight0-5em" /> {n.cn} replied to your
          comment on <u>{n.pn}</u>
        </Link>
      );
      break;
    case 'newpuzzle':
      link = (
        <Link
          className={styles.notificationLinkInner}
          href={`/crosswords/${n.p}/${slugify(n.pn)}`}
        >
          <FaRegNewspaper className="marginRight0-5em" /> {n.an} published a new
          puzzle: <u>{n.pn}</u>
        </Link>
      );
      break;
    case 'featured':
      link = (
        <Link
          className={styles.notificationLinkInner}
          href={`/crosswords/${n.p}/${slugify(n.pn)}`}
        >
          <FaRegGrinStars className="marginRight0-5em" /> Crosshare is featuring
          your puzzle <u>{n.pn}</u>
          {n.as ? ` as ${n.as}` : ' on the homepage'}!
        </Link>
      );
      break;
  }
  return (
    <div data-closing={closing} className={styles.notificationLink}>
      {link}
      <div
        role="button"
        tabIndex={0}
        onClick={close}
        onKeyPress={close}
        className="paddingLeft1em cursorPointer"
      >
        <IoMdCloseCircleOutline />
      </div>
    </div>
  );
};

export const DefaultTopBar = ({
  dashboardSelected,
  accountSelected,
  children,
}: {
  dashboardSelected?: boolean;
  accountSelected?: boolean;
  children?: ReactNode;
}) => {
  const ctxt = useContext(AuthContext);

  return (
    <TopBar>
      {children}
      {ctxt.isAdmin ? (
        <TopBarLinkA href="/admin" icon={<FaUserLock />} text="Admin" />
      ) : (
        ''
      )}
      {ctxt.user?.email ? (
        <TopBarLinkA
          disabled={dashboardSelected}
          href="/dashboard"
          icon={<FaHammer />}
          text={t`Constructor Dashboard`}
        />
      ) : (
        ''
      )}
      <TopBarLinkA
        disabled={accountSelected}
        href="/account"
        icon={<FaUser />}
        text={t`Account`}
      />
    </TopBar>
  );
};
