import { Trans } from '@lingui/macro';

export function ContactLinks() {
  return (
    <>
      <Trans>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="mailto:mike@crosshare.org"
        >
          email
        </a>{' '}
        or{' '}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://twitter.com/crosshareapp"
        >
          twitter
        </a>
      </Trans>
    </>
  );
}
