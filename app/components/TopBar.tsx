import {
  ReactNode,
  useState,
  useContext,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { FaUser, FaUserLock } from 'react-icons/fa';

import { IoMdCloseCircleOutline } from 'react-icons/io';
import { AuthContext } from './AuthContext';
import { Link } from './Link';
import { Overlay } from './Overlay';
import { Logo } from './Icons';
import {
  HEADER_HEIGHT,
  SMALL_AND_UP,
  HAS_PHYSICAL_KEYBOARD,
} from '../lib/style';
import { ButtonResetCSS } from './Buttons';
import { NotificationT } from '../lib/notifications';
import { App } from '../lib/firebaseWrapper';
import { EmbedContext } from './EmbedContext';

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
        onClick={() => setDropped(!dropped)}
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
      <div
        css={{
          verticalAlign: 'baseline',
          fontSize: HEADER_HEIGHT - 10,
          display: 'inline-block',
          width: '35%',
          textAlign: 'right',
          marginRight: '5%',
        }}
      >
        {props.icon}
      </div>
      <div
        css={{
          verticalAlign: 'baseline',
          fontSize: HEADER_HEIGHT - 20,
          display: 'inline-block',
          width: '60%',
          textAlign: 'left',
        }}
      >
        {props.text}
        {props.shortcutHint ? (
          <span
            css={{
              display: 'none',
              [HAS_PHYSICAL_KEYBOARD]: { display: 'inline' },
            }}
          >
            {' '}
            (hotkey:{' '}
            <span css={{ fontSize: HEADER_HEIGHT - 10 }}>
              {props.shortcutHint}
            </span>{' '}
            )
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
      css={{
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'inline-block',
        margin: 0,
        padding: '0.5em',
        width: '100%',
        color: 'var(--text)',
        '&:hover, &:focus': {
          textDecoration: 'none',
          backgroundColor: 'var(--top-bar-hover)',
        },
      }}
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
    <Link
      href={props.href}
      title={props.text}
      css={{
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'inline-block',
        margin: 0,
        padding: '0.5em',
        width: '100%',
        color: 'var(--text)',
        '&:hover, &:focus': {
          color: 'var(--text)',
          textDecoration: 'none',
          backgroundColor: 'var(--top-bar-hover)',
        },
      }}
    >
      <TopBarDropDownLinkContents {...props} />
    </Link>
  );
};

export const TopBarDropDownLinkSimpleA = (props: TopBarDropDownLinkAProps) => {
  return (
    <a
      href={props.href}
      title={props.text}
      css={{
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'inline-block',
        margin: 0,
        padding: '0.5em',
        width: '100%',
        color: 'var(--text)',
        '&:hover, &:focus': {
          color: 'var(--text)',
          textDecoration: 'none',
          backgroundColor: 'var(--top-bar-hover)',
        },
      }}
    >
      <TopBarDropDownLinkContents {...props} />
    </a>
  );
};

interface TopBarLinkCommonProps {
  text?: string;
  hoverText?: string;
  keepText?: boolean;
  icon: ReactNode;
  onClick?: () => void;
}
const TopBarLinkContents = (props: TopBarLinkCommonProps) => {
  return (
    <>
      <span
        css={{
          verticalAlign: 'baseline',
          fontSize: HEADER_HEIGHT - 10,
        }}
      >
        {props.icon}
      </span>
      {props.text ? (
        <span
          css={{
            marginLeft: '5px',
            verticalAlign: 'middle',
            display: props.keepText ? 'inline-block' : 'none',
            fontSize: HEADER_HEIGHT - 20,
            [SMALL_AND_UP]: {
              display: 'inline-block',
            },
          }}
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
}

export const TopBarLink = (props: TopBarLinkProps) => {
  return (
    <button
      title={props.hoverText || props.text}
      css={{
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'inline',
        margin: 0,
        padding: '0 0.45em',
        color: 'var(--text)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'clip',
        '&:hover, &:focus': {
          textDecoration: 'none',
          backgroundColor: 'var(--top-bar-hover)',
        },
      }}
      onClick={props.onClick}
    >
      <TopBarLinkContents {...props} />
    </button>
  );
};

interface TopBarLinkAProps extends TopBarLinkCommonProps {
  href: string;
  as?: string;
}

export const TopBarLinkA = (props: TopBarLinkAProps) => {
  return (
    <Link
      href={props.href}
      title={props.hoverText || props.text}
      css={{
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'inline',
        margin: 0,
        padding: '0 0.45em',
        color: 'var(--text)',
        '&:hover, &:focus': {
          color: 'var(--text)',
          textDecoration: 'none',
          backgroundColor: 'var(--top-bar-hover)',
        },
      }}
      onClick={props.onClick}
    >
      <TopBarLinkContents {...props} />
    </Link>
  );
};

export const TopBar = ({ children }: { children?: ReactNode }) => {
  const { notifications } = useContext(AuthContext);
  const isEmbed = useContext(EmbedContext);
  const now = new Date();
  const filtered = notifications?.filter((n) => n.t.toDate() <= now);
  const [showingNotifications, setShowingNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: Event) => {
      if (
        showingNotifications &&
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
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

  return useMemo(() => {
    return (
      <>
        <header
          css={{
            height: HEADER_HEIGHT,
            backgroundColor: 'var(--primary)',
          }}
        >
          <div
            css={{
              padding: '0 10px',
              height: '100%',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              lineHeight: HEADER_HEIGHT - 4 + 'px',
            }}
          >
            {isEmbed ? (
              <div css={{ flexGrow: 1 }} />
            ) : filtered?.length && !showingNotifications ? (
              <button
                type="button"
                onClick={() => setShowingNotifications(true)}
                css={[
                  ButtonResetCSS,
                  {
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                  },
                ]}
                title="View Notifications"
              >
                <Logo
                  notificationCount={filtered.length}
                  width={HEADER_HEIGHT - 4}
                  height={HEADER_HEIGHT - 4}
                />
                <span
                  css={{
                    marginLeft: '5px',
                    display: 'none',
                    color: 'var(--text)',
                    fontSize: HEADER_HEIGHT - 10,
                    [SMALL_AND_UP]: {
                      display: 'inline-block',
                    },
                  }}
                >
                  CROSSHARE
                </span>
              </button>
            ) : (
              <Link
                href="/"
                css={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none !important',
                  cursor: 'pointer',
                }}
                title="Crosshare Home"
              >
                <Logo
                  notificationCount={0}
                  width={HEADER_HEIGHT - 4}
                  height={HEADER_HEIGHT - 4}
                />
                <span
                  css={{
                    marginLeft: '5px',
                    display: 'none',
                    color: 'var(--text)',
                    fontSize: HEADER_HEIGHT - 10,
                    [SMALL_AND_UP]: {
                      display: 'inline-block',
                    },
                  }}
                >
                  CROSSHARE
                </span>
              </Link>
            )}
            <>{children}</>
          </div>
        </header>
        {filtered?.length && showingNotifications ? (
          <div
            ref={notificationsRef}
            css={{
              position: 'absolute',
              top: HEADER_HEIGHT + 10,
              left: 5,
              border: '1px solid var(--text-input-border)',
              boxShadow: '0 0 10px 10px rgba(80, 80, 80, 0.6)',
              backgroundColor: 'var(--overlay-inner)',
              width: 'calc(100vw - 10px)',
              maxWidth: '30em',
              borderRadius: 5,
              zIndex: 102,
              '&:before': {
                content: '""',
                position: 'absolute',
                top: -19,
                left: 10,
                zIndex: 101,
                border: 'solid 10px transparent',
                borderBottomColor: 'var(--overlay-inner)',
              },
              '&:after': {
                content: '""',
                position: 'absolute',
                top: -20,
                left: 10,
                zIndex: 100,
                border: 'solid 10px transparent',
                borderBottomColor: 'var(--text-input-border)',
              },
            }}
          >
            <h3
              css={{
                borderBottom: '1px solid var(--text-input-border)',
                margin: '0.5em 0 0 0',
                paddingLeft: '1em',
                fontSize: '1em',
                fontWeight: 'bold',
              }}
            >
              Notifications
            </h3>
            <div css={{ margin: '0 1em' }}>
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
  ]);
};

const NotificationLinkCSS = {
  display: 'block',
  flex: 1,
  color: 'var(--text)',
  padding: '1em',
  '&:hover, &:focus': {
    color: 'var(--text)',
    textDecoration: 'none',
    backgroundColor: 'var(--top-bar-hover)',
  },
};

const ANIMATION_DELAY = 250;

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
    setTimeout(() => {
      App.firestore().collection('n').doc(n.id).update({ r: true });
    }, ANIMATION_DELAY);
  }, [n.id]);

  let link: JSX.Element;
  switch (n.k) {
  case 'comment':
    link = (
      <Link css={NotificationLinkCSS} href={`/crosswords/${n.p}`}>
        {n.cn} commented on <u>{n.pn}</u>
      </Link>
    );
    break;
  case 'reply':
    link = (
      <Link css={NotificationLinkCSS} href={`/crosswords/${n.p}`}>
        {n.cn} replied to your comment on <u>{n.pn}</u>
      </Link>
    );
    break;
  case 'newpuzzle':
    link = (
      <Link css={NotificationLinkCSS} href={`/crosswords/${n.p}`}>
        {n.an} published a new puzzle: <u>{n.pn}</u>
      </Link>
    );
    break;
  case 'featured':
    link = (
      <Link css={NotificationLinkCSS} href={`/crosswords/${n.p}`}>
          Crosshare is featuring your puzzle <u>{n.pn}</u>
        {n.as ? ` as ${n.as}` : ' on the homepage'}!
      </Link>
    );
    break;
  }
  return (
    <div
      css={{
        transition: 'all ' + ANIMATION_DELAY + 'ms ease-in-out 0s',
        maxHeight: 500,
        overflow: 'hidden',
        ...(closing && { maxHeight: 0 }),
        display: 'flex',
        alignItems: 'center',
        '& + &': {
          borderTop: '1px solid var(--text-input-border)',
        },
      }}
    >
      {link}
      <div
        role="button"
        tabIndex={0}
        onClick={close}
        onKeyPress={close}
        css={{
          paddingLeft: '1em',
          cursor: 'pointer',
        }}
      >
        <IoMdCloseCircleOutline />
      </div>
    </div>
  );
};

export const DefaultTopBar = ({ children }: { children?: ReactNode }) => {
  const { isAdmin } = useContext(AuthContext);

  return (
    <TopBar>
      {children}
      {isAdmin ? (
        <TopBarLinkA href="/admin" icon={<FaUserLock />} text="Admin" />
      ) : (
        ''
      )}
      <TopBarLinkA href="/account" icon={<FaUser />} text="Account" />
    </TopBar>
  );
};
