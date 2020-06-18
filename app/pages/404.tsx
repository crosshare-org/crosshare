import Head from 'next/head';

import { Link } from '../components/Link';
import { Logo } from '../components/Icons';

export default function Custom404Page() {
  return <>
    <Head>
      <title>Page Not Found | Crosshare</title>
    </Head>
    <div css={{
      backgroundColor: 'var(--primary)',
      width: '100%',
      height: '100%',
      textAlign: 'center',
      paddingTop: '5em',
    }}>
      <Logo width='15em' height='15em' />
      <h1 css={{ marginTop: '1em' }}>Page Not Found</h1>
      <p>We&apos;re sorry, we couldn&apos;t find the page you requested.</p>
      <p>Try the <Link href="/" passHref>homepage</Link>.</p>
    </div>
  </>;
}
