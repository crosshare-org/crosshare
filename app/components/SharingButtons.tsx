import { mix } from 'color2k';
import { ReactNode } from 'react';
import { FaTwitter, FaFacebook, FaEnvelope } from 'react-icons/fa';

enum Network {
  Facebook,
  Twitter,
  Email
}

function linkName(network: Network): string {
  switch (network) {
  case Network.Facebook:
    return 'Facebook';
  case Network.Twitter:
    return 'Twitter';
  case Network.Email:
    return 'Email';
  }
}

function colors(network: Network): string {
  switch (network) {
  case Network.Facebook:
    return '#3b5998';
  case Network.Twitter:
    return '#55acee';
  case Network.Email:
    return '#777777';
  }
}

function url(network: Network, path: string, text: string): string {
  const urlToShare = encodeURIComponent('https://crosshare.org' + path);
  const textToShare = encodeURIComponent(text);
  switch (network) {
  case Network.Facebook:
    return 'https://facebook.com/sharer/sharer.php?u=' + urlToShare;
  case Network.Twitter:
    return 'https://twitter.com/intent/tweet/?text=' + textToShare + '&url=' + urlToShare;
  case Network.Email:
    return 'mailto:?subject=' + textToShare + '&body=' + urlToShare;
  }
}

function icon(network: Network): ReactNode {
  switch (network) {
  case Network.Facebook:
    return <FaFacebook css={{ verticalAlign: 'text-bottom', }} />;
  case Network.Twitter:
    return <FaTwitter css={{ verticalAlign: 'text-bottom', }} />;
  case Network.Email:
    return <FaEnvelope css={{ verticalAlign: 'text-bottom', }} />;
  }
}

interface SharingButtonProps extends SharingButtonsProps {
  network: Network
}

function SharingButton({ network, path, text }: SharingButtonProps) {
  return <a css={{
    display: 'inline-block',
    margin: '0 0.2em',
    padding: '0.2em 0.5em',
    borderRadius: '0.3em',
    color: '#fff',
    backgroundColor: mix(colors(network), 'black', 0.3),
    ['&:hover, &:active']: {
      backgroundColor: mix(colors(network), 'black', 0.4),
      color: '#fff',
      textDecoration: 'none',
    }
  }} href={url(network, path, text)} target='_blank' rel='noopener noreferrer' aria-label={linkName(network)}>
    {icon(network)}<span css={{ marginLeft: '0.3em' }}>{linkName(network)}</span>
  </a>;
}

interface SharingButtonsProps {
  path: string,
  text: string
}

export function SharingButtons(props: SharingButtonsProps) {
  return <div css={{ maxHeight: '1.9em', overflow: 'hidden', margin: '1em 0' }}>
    <b css={{marginRight: '0.3em'}}>Share:</b>
    <SharingButton network={Network.Facebook} {...props} />
    <SharingButton network={Network.Twitter} {...props} />
    <SharingButton network={Network.Email} {...props} />
  </div >;
}
