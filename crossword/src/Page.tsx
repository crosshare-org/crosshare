/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from "@reach/router";

import { TopBar } from './TopBar';
import { Footer } from './Footer';

interface SquareAndColsProps {
  square: React.ReactNode,
  left: React.ReactNode,
  right: React.ReactNode
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  return (
    <div css={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'end',
      justifyContent: 'space-around',
    }}>
      <div css={{
        padding: '10px',
        height: 'calc(min(60vh - 84px, 100vw))',
        width: 'calc(min(60vh - 84px, 100vw))',
        '@media (min-width: 576px)': {
          height: 'calc(min(100vh - 84px, 66vw))',
          width: 'calc(min(100vh - 84px, 66vw))',
        },
        '@media (min-width: 992px)': {
          height: 'calc(min(100vh - 84px, 50vw))',
          width: 'calc(min(100vh - 84px, 50vw))',
        },
      }}>
        {props.square}
      </div>
      <div css={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'end',
        flex: 'auto',
        width: '100vw',
        height: '40vh',
        '@media (min-width: 576px)': {
          width: '34vw',
          height: 'calc(100vh - 84px)',
        },
        '@media (min-width: 992px)': {
          width: '50vw',
          height: 'calc(100vh - 84px)',

        },
      }}>
        <div css={{
          flex: 'auto',
          padding: '10px',
          width: '100%',
          height: '50%',
          '@media (min-width: 992px)': {
            width: '50%',
            height: '100%',
          },
        }}>{props.left}</div>
        <div css={{
          flex: 'auto',
          padding: '10px',
          width: '100%',
          height: '50%',
          '@media (min-width: 992px)': {
            width: '50%',
            height: '100%',
          },
        }}>{props.right}</div>
      </div>
    </div>
  );
}

export const SquareTest = (_: RouteComponentProps) => {
  return (
    <Page>
      <SquareAndCols
        square={<div css={{ backgroundColor: 'blue', height: '100%' }}>a</div>}
        left={<div css={{ backgroundColor: 'green', height: '100%' }}>b</div>}
        right={<div css={{ backgroundColor: 'yellow', height: '100%' }}>c</div>}
      />
    </Page>
  );
}

interface PageProps extends RouteComponentProps {
  children: React.ReactNode
}

export const Page = (props: PageProps) => {
  return (
    <React.Fragment>
      <TopBar />
      {props.children}
      <Footer />
    </React.Fragment>
  );
}
