import { ReactNode } from 'react';
import Head from 'next/head';

import { Logo } from '../components/Icons';
import { Link } from '../components/Link';

export const ErrorPage = (props: { title: string; children?: ReactNode }) => {
  return (
    <>
      <Head>
        <title>{props.title} | Crosshare</title>
      </Head>
      <div
        css={{
          backgroundColor: 'var(--primary)',
          width: '100%',
          height: '100%',
          textAlign: 'center',
          paddingTop: '5em',
        }}
      >
        <Link href="/">
          <Logo notificationCount={0} width="15em" height="15em" />
        </Link>
        <h1 css={{ marginTop: '1em' }}>{props.title}</h1>
        {props.children}
        <p>
          Click the angry bunny (or <Link href="/">here</Link>) to try the
          homepage.
        </p>
      </div>
    </>
  );
};
