import { ReactNode } from 'react';
import Head from 'next/head';

import { Logo } from '../components/Icons';

export const ErrorPage = (props: { title: string, children?: ReactNode }) => {
  return <>
    <Head>
      <title>{props.title} | Crosshare</title>
    </Head>
    <div css={{
      backgroundColor: 'var(--primary)',
      width: '100%',
      height: '100%',
      textAlign: 'center',
      paddingTop: '5em',
    }}>
      <Logo notificationCount={0} width='15em' height='15em' />
      <h1 css={{ marginTop: '1em' }}>{props.title}</h1>
      {props.children}
    </div>
  </>;
};
