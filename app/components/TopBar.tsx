import { ReactNode, useState, useContext, useMemo } from 'react';
import { FaUser, FaUserLock, FaHome } from 'react-icons/fa';

import { AuthContext } from './AuthContext';
import { Link } from './Link';
import { Overlay } from './Overlay';
import { Logo } from './Icons';
import { HEADER_HEIGHT, SMALL_AND_UP, HAS_PHYSICAL_KEYBOARD } from '../lib/style';
import { ButtonResetCSS } from './Buttons';
import { NotificationT } from '../lib/notifications';

export const TopBarDropDown = (props: { onClose?: () => void, text: string, icon: ReactNode, hoverText?: string, children: (close: () => void) => ReactNode }) => {
  const [dropped, setDropped] = useState(false);
  const close = () => { props.onClose ?.(); setDropped(false); };
  return (
    <>
      <TopBarLink onClick={() => setDropped(!dropped)} text={props.text} icon={props.icon} hoverText={props.hoverText} />
      <Overlay onClick={close} closeCallback={close} hidden={!dropped}>
        {props.children(close)}
      </Overlay>
    </>
  );
};

export const NestedDropDown = (props: { onClose?: () => void, text: string, icon: ReactNode, closeParent: () => void, children: (close: () => void) => ReactNode }) => {
  const [dropped, setDropped] = useState(false);
  const close = () => { props.onClose ?.(); setDropped(false); };
  return (
    <>
      <TopBarDropDownLink onClick={() => { props.closeParent(); setDropped(true); }} text={props.text} icon={props.icon} />
      <Overlay onClick={close} closeCallback={close} hidden={!dropped}>
        {props.children(close)}
      </Overlay>
    </>
  );
};

interface TopBarDropDownLinkCommonProps { shortcutHint?: ReactNode, text: string, icon: ReactNode }
const TopBarDropDownLinkContents = (props: TopBarDropDownLinkCommonProps) => {
  return <>
    <div css={{
      verticalAlign: 'baseline',
      fontSize: HEADER_HEIGHT - 10,
      display: 'inline-block',
      width: '35%',
      textAlign: 'right',
      marginRight: '5%',
    }}>{props.icon}</div>
    <div css={{
      verticalAlign: 'baseline',
      fontSize: HEADER_HEIGHT - 20,
      display: 'inline-block',
      width: '60%',
      textAlign: 'left',
    }}>{props.text}{props.shortcutHint ? <span css={{ display: 'none', [HAS_PHYSICAL_KEYBOARD]: { display: 'inline' } }}> (hotkey: <span css={{ fontSize: HEADER_HEIGHT - 10 }}>{props.shortcutHint}</span> )</span> : ''}</div>
  </>;
};

interface TopBarDropDownLinkProps extends TopBarDropDownLinkCommonProps {
  onClick?: () => void
}
export const TopBarDropDownLink = (props: TopBarDropDownLinkProps) => {
  return (
    <button title={props.text} css={{
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
    }} onClick={props.onClick}>
      <TopBarDropDownLinkContents {...props} />
    </button>
  );
};

interface TopBarDropDownLinkAProps extends TopBarDropDownLinkCommonProps {
  href: string,
  as?: string,
}
export const TopBarDropDownLinkA = (props: TopBarDropDownLinkAProps) => {
  return (
    <Link href={props.href} as={props.as} passHref title={props.text} css={{
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
    }}>
      <TopBarDropDownLinkContents {...props} />
    </Link>
  );
};

export const TopBarDropDownLinkSimpleA = (props: TopBarDropDownLinkAProps) => {
  return (
    <a href={props.href} title={props.text} css={{
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
    }}>
      <TopBarDropDownLinkContents {...props} />
    </a>
  );
};

interface TopBarLinkCommonProps {
  text?: string,
  hoverText?: string,
  keepText?: boolean,
  icon: ReactNode,
  onClick?: () => void
}
const TopBarLinkContents = (props: TopBarLinkCommonProps) => {
  return <>
    <span css={{
      verticalAlign: 'baseline',
      fontSize: HEADER_HEIGHT - 10,
    }}>{props.icon}</span>
    {props.text ?
      <span css={{
        marginLeft: '5px',
        verticalAlign: 'middle',
        display: props.keepText ? 'inline-block' : 'none',
        fontSize: HEADER_HEIGHT - 20,
        [SMALL_AND_UP]: {
          display: 'inline-block',
        }
      }}>{props.text}</span>
      : ''}
  </>;
};

interface TopBarLinkProps extends TopBarLinkCommonProps {
  onClick?: () => void
}

export const TopBarLink = (props: TopBarLinkProps) => {
  return (
    <button title={props.hoverText || props.text} css={{
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline',
      margin: 0,
      padding: '0 0.45em',
      color: 'var(--text)',
      '&:hover, &:focus': {
        textDecoration: 'none',
        backgroundColor: 'var(--top-bar-hover)',
      },
    }} onClick={props.onClick}>
      <TopBarLinkContents {...props} />
    </button>
  );
};

interface TopBarLinkAProps extends TopBarLinkCommonProps {
  href: string,
  as?: string
}

export const TopBarLinkA = (props: TopBarLinkAProps) => {
  return (
    <Link href={props.href} as={props.as} passHref title={props.hoverText || props.text} css={{
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
    }} onClick={props.onClick}>
      <TopBarLinkContents {...props} />
    </Link>
  );
};

interface TopBarProps {
  children?: ReactNode
}

export const TopBar = ({ children }: TopBarProps) => {
  const { notifications } = useContext(AuthContext);
  const [showingNotifications, setShowingNotifications] = useState(false);
  return useMemo(() => {
    return <>
      <header css={{
        height: HEADER_HEIGHT,
        backgroundColor: 'var(--primary)',
      }}>
        <div css={{
          padding: '0 10px',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          lineHeight: (HEADER_HEIGHT - 4) + 'px',
        }}>
          {notifications ?.length ?
            <button type="button" onClick={() => setShowingNotifications(true)} css={[ButtonResetCSS,
              {
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
              }
            ]} title="View Notifications">
              <Logo notificationCount={notifications.length} width={HEADER_HEIGHT - 4} height={HEADER_HEIGHT - 4} />
              <span css={{
                marginLeft: '5px',
                display: 'none',
                color: 'var(--text)',
                fontSize: HEADER_HEIGHT - 10,
                [SMALL_AND_UP]: {
                  display: 'inline-block',
                }
              }}>CROSSHARE</span>
            </button>
            :
            <Link href="/" passHref css={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none !important',
              cursor: 'pointer',
            }} title="Crosshare Home">
              <Logo notificationCount={0} width={HEADER_HEIGHT - 4} height={HEADER_HEIGHT - 4} />
              <span css={{
                marginLeft: '5px',
                display: 'none',
                color: 'var(--text)',
                fontSize: HEADER_HEIGHT - 10,
                [SMALL_AND_UP]: {
                  display: 'inline-block',
                }
              }}>CROSSHARE</span>
            </Link>
          }
          <>
            {children}
          </>
        </div>
      </header>
      {notifications ?.length && showingNotifications ?
        <Overlay closeCallback={() => setShowingNotifications(false)}>
          <TopBarDropDownLinkA icon={<FaHome />} href="/" text="Crosshare Home" />
          <h3 css={{ fontWeight: 'normal', textDecoration: 'underline' }}>Notifications</h3>
          {notifications.map(n => <NotificationLink key={n.id} notification={n} />)}
        </Overlay>
        : ''}
    </>;
  }, [children, notifications, showingNotifications, setShowingNotifications]);
};

const NotificationLinkCSS = {
  display: 'block',
  color: 'var(--text)',
  padding: '1em',
  '&:hover, &:focus': {
    color: 'var(--text)',
    textDecoration: 'none',
    backgroundColor: 'var(--top-bar-hover)',
  },
};

const NotificationLink = ({ notification: n }: { notification: NotificationT }) => {
  switch (n.k) {
  case 'comment':
    return <Link css={NotificationLinkCSS} href="/crosswords/[puzzleId]" as={`/crosswords/${n.p}`}>{`• ${n.cn} commented on ${n.pn}`}</Link>;
  case 'reply':
    return <Link css={NotificationLinkCSS} href="/crosswords/[puzzleId]" as={`/crosswords/${n.p}`}>{`• ${n.cn} replied to your comment on ${n.pn}`}</Link>;
  }
};

export const DefaultTopBar = () => {
  const { isAdmin } = useContext(AuthContext);

  return <TopBar>
    {isAdmin ?
      <TopBarLinkA href='/admin' icon={<FaUserLock />} text="Admin" />
      : ''}
    <TopBarLinkA href='/account' icon={<FaUser />} text="Account" />
  </TopBar>;
};
