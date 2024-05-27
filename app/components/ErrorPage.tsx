import Head from 'next/head';
import { ReactNode } from 'react';
import { Logo } from '../components/Icons.js';
import { Link } from '../components/Link.js';
import styles from './ErrorPage.module.css';

export const ErrorPage = (props: { title: string; children?: ReactNode }) => {
  return (
    <>
      <Head>
        <title>{`${props.title} | Crosshare`}</title>
      </Head>
      <div className={styles.page}>
        <Link href="/">
          <Logo notificationCount={0} width="15em" height="15em" />
        </Link>
        <h1 className="marginTop1em">{props.title}</h1>
        {props.children}
        <p>
          Click the angry bunny (or <Link href="/">here</Link>) to try the
          homepage.
        </p>
      </div>
    </>
  );
};
