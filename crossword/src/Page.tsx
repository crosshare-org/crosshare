import * as React from 'react';
import { RouteComponentProps } from "@reach/router";

import { TopBar } from './TopBar';

interface PageProps extends RouteComponentProps {
  children: React.ReactNode
}

export const Page = (props: PageProps) => {
  return (
    <>
    <TopBar/>
    {props.children}
    </>
  );
}
