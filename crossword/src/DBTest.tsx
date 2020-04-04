/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { RouteComponentProps } from "@reach/router";

import * as WordDB from './WordDB';
import { Page } from './Page';

export const DBTest = (_: RouteComponentProps) => {
  const [status, setStatus] = React.useState(WordDB.DBStatus.uninitialized);
  WordDB.initializeOrBuild((_) => setStatus(WordDB.dbStatus));

  if (status === WordDB.DBStatus.present && WordDB.dbEncoded) {
    return (
      <Page title="DB Status">
        <p>DB is loaded. Five letter words: {WordDB.dbEncoded.words["5"] && WordDB.dbEncoded.words["5"].length}</p>
      </Page>
    );
  }
  return <Page title="DB Status">DB status: {WordDB.dbStatus}</Page>
}
